defmodule Console.Deployments.Observability do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  import Console.Deployments.Observability.Metrics
  alias Prometheus.Client, as: PrometheusClient
  alias Console.Deployments.Settings
  alias Console.PubSub
  alias Console.Schema.{
    User,
    Alert,
    Cluster,
    Project,
    Service,
    AlertResolution,
    DeploymentSettings,
    ObservabilityProvider,
    ObservabilityWebhook,
    ServiceComponent,
  }

  @cache Console.conf(:cache_adapter)
  @ttl :timer.minutes(30)

  @noisy_threshold 3

  require Logger

  @type error :: Console.error
  @type provider_resp :: {:ok, ObservabilityProvider.t} | error
  @type webhook_resp :: {:ok, ObservabilityWebhook.t} | error

  @spec get_provider(binary) :: ObservabilityProvider.t | nil
  def get_provider(id), do: Repo.get(ObservabilityProvider, id)

  @spec get_provider(binary) :: ObservabilityProvider.t
  def get_provider!(id), do: Repo.get!(ObservabilityProvider, id)

  @spec get_provider_by_name(binary) :: ObservabilityProvider.t | nil
  def get_provider_by_name(name), do: Repo.get_by(ObservabilityProvider, name: name)

  @spec get_provider_by_name(binary) :: ObservabilityProvider.t
  def get_provider_by_name!(name), do: Repo.get_by!(ObservabilityProvider, name: name)

  @spec get_webhook(binary) :: ObservabilityWebhook.t | nil
  def get_webhook(id), do: Repo.get(ObservabilityWebhook, id)

  @spec get_webhook(binary) :: ObservabilityWebhook.t
  def get_webhook!(id), do: Repo.get!(ObservabilityWebhook, id)

  @spec get_webhook_by_name(binary) :: ObservabilityWebhook.t | nil
  def get_webhook_by_name(name), do: Repo.get_by(ObservabilityWebhook, name: name)

  @spec get_webhook_by_name(binary) :: ObservabilityWebhook.t
  def get_webhook_by_name!(name), do: Repo.get_by!(ObservabilityWebhook, name: name)

  @spec get_webhook_by_ext_id(binary) :: ObservabilityWebhook.t | nil
  @decorate cacheable(cache: @cache, key: {:obs_webhook, id}, opts: [ttl: @ttl])
  def get_webhook_by_ext_id(id), do: Repo.get_by!(ObservabilityWebhook, external_id: id)

  @spec get_alert!(binary) :: Alert.t | nil
  def get_alert!(id), do: Repo.get!(Alert, id)

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
  create or update an observability provider webhook, must include name in attrs
  """
  @spec upsert_webhook(map, User.t) :: webhook_resp
  def upsert_webhook(%{name: name} = attrs, %User{} = user) do
    case get_webhook_by_name(name) do
      %ObservabilityWebhook{} = prov -> prov
      nil -> %ObservabilityWebhook{}
    end
    |> ObservabilityWebhook.changeset(attrs)
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
  Delete a webhook by id
  """
  @spec delete_webhook(binary, User.t) :: webhook_resp
  def delete_webhook(id, %User{} = user) do
    get_webhook!(id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Determines if an individual alert is accessible from a user to perform the given action
  """
  @spec accessible(Alert.t, User.t, atom) :: {:ok, any} | error
  def accessible(%Alert{} = alert, %User{} = user, action) do
    case Repo.preload(alert, [:service, :cluster, :project]) do
      %Alert{service: %Service{} = svc} -> allow(svc, user, action)
      %Alert{cluster: %Cluster{} = cluster} -> allow(cluster, user, action)
      %Alert{project: %Project{} = project} -> allow(project, user, action)
      _ -> {:error, :forbidden}
    end
  end

  @doc """
  Persists the resolution associated with this alert, cannot be done if the user doesn't have write access
  """
  @spec set_resolution(map, binary, User.t) :: {:ok, AlertResolution.t} | Console.error
  def set_resolution(attrs, alert_id, %User{} = user) do
    start_transaction()
    |> add_operation(:alert, fn _ ->
      get_alert!(alert_id)
      |> accessible(user, :write)
    end)
    |> add_operation(:upsert, fn _ ->
      case Repo.get_by(AlertResolution, alert_id: alert_id) do
        %AlertResolution{} = res -> res
        nil -> %AlertResolution{alert_id: alert_id}
      end
      |> AlertResolution.changeset(attrs)
      |> Repo.insert_or_update()
    end)
    |> execute(extract: :upsert)
    |> notify(:create)
  end

  @doc """
  Saves a set of parsed alert data straight to the db
  """
  @spec persist_alert([map]) :: {:ok, Alert.t} | error
  def persist_alert(alerts) when is_list(alerts) do
    Enum.with_index(alerts)
    |> Enum.reduce(start_transaction(), fn
      {%{fingerprint: fp} = attrs, ind}, acc when is_binary(fp) ->
        add_operation(acc, {:alert, ind}, fn _ ->
          case Repo.get_by(Alert, fingerprint: fp) do
            %Alert{} = alert -> Repo.preload(alert, [:tags])
            nil -> %Alert{fingerprint: fp}
          end
          |> Alert.changeset(attrs)
          |> Repo.insert_or_update()
        end)
      _, acc -> acc
    end)
    |> execute()
    |> case do
      {:ok, res} ->
        Enum.each(res, fn {_, alert} -> handle_notify(PubSub.AlertCreated, alert) end)
        {:ok, res}
      err -> err
    end
  end

  @doc """
  Gathers a heat map of pod utilization for the given cluster or service
  """
  @spec heat_map(Cluster.t | Service.t, :pod | :namespace | :node) :: {:ok, map} | error
  def heat_map(resource, flavor \\ :pod)
  def heat_map(%Cluster{handle: cluster}, flavor) do
    queries(:heat, flavor)
    |> bulk_query(%{cluster: cluster, filter: ""})
  end

  def heat_map(%Service{namespace: ns} = service, flavor) when flavor in [:pod, :node] do
    %Service{cluster: %Cluster{handle: cluster}} =
      Repo.preload(service, [:cluster])

    queries(:heat, flavor)
    |> bulk_query(%{cluster: cluster, filter: ",namespace=\"#{ns}\""})
  end

  def heat_map(_, flavor), do: {:error, "cannot aggregate utilization by #{flavor} for that resource"}

  @doc """
  Queries memory usage by pod for a given cluster and filters those that don't exceed a significant threshold
  """
  @spec noisy_neighbors(Cluster.t) :: {:ok, map} | error
  def noisy_neighbors(%Cluster{handle: cluster}) do
    queries(:noisy)
    |> bulk_query(%{cluster: cluster})
    |> case do
      {:ok, %{cpu: %Prometheus.Data{result: cpu} = cpu_res, memory: %Prometheus.Data{result: memory} = mem_res}} ->
        cpu    = Enum.filter(cpu, & &1.value > @noisy_threshold)
        memory = Enum.filter(memory, & &1.value > @noisy_threshold)
        {:ok, %{cpu: %{cpu_res | result: cpu}, memory: %{mem_res | result: memory}}}
      err -> err
    end
  end

  @doc """
  Queries opinionated metrics for a set of different, relevant scopes
  """
  @spec query(Cluster.t | {Cluster.t, binary} | ServiceComponent.t, binary, binary, binary) :: {:ok, map} | error
  def query(%Cluster{handle: cluster}, start, stop, step) do
    queries(:cluster)
    |> bulk_range_query(%{cluster: cluster}, start, stop, step)
  end

  def query({%Cluster{handle: cluster}, node}, start, stop, step) do
    queries(:node)
    |> bulk_range_query(%{cluster: cluster, instance: node}, start, stop, step)
  end

  def query(%ServiceComponent{} = component, start, stop, step) do
    component = Repo.preload(component, [service: :cluster])
    with {:ok, args} <- component_args(component) do
      queries(:component)
      |> bulk_range_query(args, start, stop, step)
    end
  end

  defp component_args(%ServiceComponent{group: "apps", version: "v1", kind: "Deployment", name: name, namespace: ns} = comp),
    do: {:ok, [namespace: ns, name: name, cluster: comp.service.cluster.handle, regex: "-[a-z0-9]+-[a-z0-9]+"]}
  defp component_args(%ServiceComponent{group: "apps", version: "v1", kind: "StatefulSet", name: name, namespace: ns} = comp),
    do: {:ok, [namespace: ns, name: name, cluster: comp.service.cluster.handle, regex: "-[0-9]+"]}
  defp component_args(%ServiceComponent{group: g, kind: k}), do: {:error, "unsupported component kind #{g}/#{k}"}

  defp bulk_query(queries, ctx) do
    with {:ok, client} <- get_connection(:prometheus) do
      Task.async_stream(queries, fn {name, query} ->
        case PrometheusClient.query(client, query, ctx) do
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

  defp bulk_range_query(queries, ctx, start, stop, step) do
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

  defp notify({:ok, %AlertResolution{} = res}, :create),
    do: handle_notify(PubSub.AlertResolutionCreated, res)
  defp notify(pass, _), do: pass
end
