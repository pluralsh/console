defmodule Console.AI.Tools.Workbench.Infrastructure.ApiDiscovery do
  use Console.AI.Tools.Agent.Base
  alias Console.Deployments.{Clusters, Policies}
  alias Console.Schema.{Cluster, User}

  embedded_schema do
    field :user, :map, virtual: true
    field :cluster, :string
    field :group, :string
    field :version, :string
    field :kind, :string
  end

  @valid ~w(cluster group version kind)a
  @json_schema Console.priv_file!("tools/workbench/infrastructure/api_discovery.json")
               |> Jason.decode!()

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required([:cluster])
  end

  def json_schema(_), do: @json_schema
  def name(_), do: "api_discovery"

  def description(_) do
    "Lists Kubernetes API groups, versions, kinds, and plural resource names available on a cluster, with optional group, version, and kind filters. Use this to discover the exact API before inspecting its schema or querying resources."
  end

  def implement(%__MODULE__{user: %User{} = user, cluster: handle} = tool) do
    with {:cluster, %Cluster{} = cluster} <-
           {:cluster, Clusters.get_cluster_by_handle(handle)},
         {:access, {:ok, %Cluster{} = cluster}} <-
           {:access, Policies.allow(cluster, user, :read)},
         %{} = discovery <- Clusters.api_discovery(cluster) do
      discovery
      |> Enum.filter(fn {{group, version, kind}, _} ->
        matches?(group, tool.group) and
          matches?(version, tool.version) and
          matches?(kind, tool.kind)
      end)
      |> Enum.map(fn {{group, version, kind}, plural} ->
        %{group: group, version: version, kind: kind, plural: plural}
      end)
      |> Jason.encode()
    else
      {:cluster, _} -> {:error, "No cluster found matching handle=#{handle}"}
      {:access, error} -> error
      error -> error
    end
  end

  defp matches?(_, nil), do: true

  defp matches?(value, filter) when is_binary(value) and is_binary(filter),
    do: String.contains?(String.downcase(value), String.downcase(filter))

  defp matches?(_, _), do: false
end
