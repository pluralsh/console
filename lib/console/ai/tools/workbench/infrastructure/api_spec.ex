defmodule Console.AI.Tools.Workbench.Infrastructure.ApiSpec do
  use Console.AI.Tools.Agent.Base
  alias Console.Deployments.{Clusters, Policies}
  alias Console.Schema.{Cluster, User}

  embedded_schema do
    field :user, :map, virtual: true
    field :cluster, :string
    field :group, :string
    field :version, :string
    field :query, :string
  end

  @valid ~w(cluster group version query)a
  @json_schema Console.priv_file!("tools/workbench/infrastructure/api_spec.json")
               |> Jason.decode!()

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  def json_schema(_), do: @json_schema
  def name(_), do: "api_spec"

  def description(_) do
    "Searches a Kubernetes cluster's OpenAPI schema for kinds in a specific API group and version. Use api_discovery first to identify the exact group and version. This is the source of truth for CRD schemas installed on that cluster."
  end

  def implement(%__MODULE__{user: %User{} = user, cluster: handle} = tool) do
    with {:cluster, %Cluster{} = cluster} <-
           {:cluster, Clusters.get_cluster_by_handle(handle)},
         {:access, {:ok, %Cluster{} = cluster}} <-
           {:access, Policies.allow(cluster, user, :read)},
         {:ok, %{"components" => %{"schemas" => schemas}}} <-
           Clusters.api_spec(cluster, tool.group, tool.version) do
      schemas
      |> Enum.filter(fn {name, _} ->
        String.contains?(String.downcase(name), String.downcase(tool.query))
      end)
      |> Enum.take(5)
      |> Map.new()
      |> Jason.encode()
    else
      {:cluster, _} -> {:error, "No cluster found matching handle=#{handle}"}
      {:access, error} -> error
      error -> error
    end
  end
end
