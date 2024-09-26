defmodule Console.Deployments.Observability do
  use Console.Services.Base
  import Console.Deployments.Policies
  import Console.Deployments.Observability.Metrics
  alias Prometheus.Client, as: PrometheusClient
  alias Console.Deployments.Settings
  alias Console.Schema.{
    DeploymentSettings,
    ObservabilityProvider,
    User,
    ServiceComponent,
    Cluster
  }

  require Logger

  @type error :: Console.error
  @type provider_resp :: {:ok, ObservabilityProvider.t} | error

  @spec get_provider(binary) :: ObservabilityProvider.t | nil
  def get_provider(id), do: Repo.get(ObservabilityProvider, id)

  @spec get_provider(binary) :: ObservabilityProvider.t
  def get_provider!(id), do: Repo.get!(ObservabilityProvider, id)

  @spec get_provider_by_name(binary) :: ObservabilityProvider.t | nil
  def get_provider_by_name(name), do: Repo.get_by(ObservabilityProvider, name: name)

  @spec get_provider_by_name(binary) :: ObservabilityProvider.t
  def get_provider_by_name!(name), do: Repo.get_by!(ObservabilityProvider, name: name)

  @doc """
  Create or update a provider, must inclue name in attrs
  """
  @spec upsert_provider(map, User.t) :: provider_resp
  def upsert_provider(%{name: name} = attrs, %User{} = user) do
    case get_provider_by_name(name) do
      %ObservabilityProvider{} = prov -> prov
      nil -> %ObservabilityProvider{}
    end
    |> ObservabilityProvider.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Delete a provider by id
  """
  @spec delete_provider(binary, User.t) :: provider_resp
  def delete_provider(id, %User{} = user) do
    get_provider!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Queries opinionated metrics for a set of different, relevant scopes
  """
  @spec query(Cluster.t | {Cluster.t, binary} | ServiceComponent.t, binary, binary, binary) :: {:ok, map} | error
  def query(%Cluster{handle: cluster}, start, stop, step) do
    queries(:cluster)
    |> bulk_query(%{cluster: cluster}, start, stop, step)
  end

  def query({%Cluster{handle: cluster}, node}, start, stop, step) do
    queries(:node)
    |> bulk_query(%{cluster: cluster, instance: node}, start, stop, step)
  end

  def query(%ServiceComponent{} = component, start, stop, step) do
    component = Repo.preload(component, [service: :cluster])
    with {:ok, args} <- component_args(component) do
      queries(:component)
      |> bulk_query(args, start, stop, step)
    end
  end

  defp component_args(%ServiceComponent{group: "apps", version: "v1", kind: "Deployment", name: name, namespace: ns} = comp),
    do: {:ok, [namespace: ns, name: name, cluster: comp.service.cluster.handle, regex: "-[a-z0-9]+-[a-z0-9]+"]}
  defp component_args(%ServiceComponent{group: "apps", version: "v1", kind: "StatefulSet", name: name, namespace: ns} = comp),
    do: {:ok, [namespace: ns, name: name, cluster: comp.service.cluster.handle, regex: "-[0-9]+"]}
  defp component_args(%ServiceComponent{group: g, kind: k}), do: {:error, "unsupported component kind #{g}/#{k}"}

  defp bulk_query(queries, ctx, start, stop, step) do
    with {:ok, client} <- get_connection(:prometheus) do
      Task.async_stream(queries, fn {name, query} ->
        case PrometheusClient.query(client, query, start, stop, step, ctx) do
          {:ok, %{data: %{result: results}}} -> {name, results}
          err ->
            Logger.error "prometheus query #{query} failed: #{inspect(err)}"
            {name, []}
        end
      end, max_concurrency: 5)
      |> Enum.filter(fn
        {:ok, _} -> true
        _ -> false
      end)
      |> Map.new(fn {:ok, v} -> v end)
      |> ok()
    end
  end

  defp get_connection(scope) do
    with %DeploymentSettings{} = settings <- Settings.fetch(),
         %DeploymentSettings.Connection{} = conn <- find(settings, scope) do
      {:ok, conn}
    else
      _ -> {:error, "#{scope} client not configured"}
    end
  end

  defp find(%DeploymentSettings{loki_connection: loki}, :loki), do: loki
  defp find(%DeploymentSettings{prometheus_connection: prometheus}, :prometheus), do: prometheus
  defp find(_, _), do: nil
end
