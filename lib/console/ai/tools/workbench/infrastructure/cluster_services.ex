defmodule Console.AI.Tools.Workbench.Infrastructure.ClusterServices do
  use Console.AI.Tools.Agent.Base
  alias Console.Deployments.{Clusters, Policies}
  alias Console.Repo
  alias Console.Schema.{Cluster, Service, User}

  embedded_schema do
    field :user, :map, virtual: true
    field :cluster, :string
    field :q, :string
  end

  @valid ~w(cluster q)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(cluster)a)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/cluster_services.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_cluster_services"
  def description(_), do: "List Plural services deployed to a cluster. Pass the cluster handle from plrl_clusters; use plrl_service with a service id for details."

  def implement(%__MODULE__{user: %User{} = user, cluster: handle, q: q}) do
    with %Cluster{} = cluster <- Clusters.get_cluster_by_handle(handle),
         {:ok, _} <- Policies.allow(cluster, user, :read) do
      Service.for_user(user)
      |> Service.for_cluster(cluster.id)
      |> Service.ordered()
      |> maybe_search(q)
      |> Repo.all()
      |> Repo.preload([:cluster])
      |> Enum.map(&service_brief/1)
      |> Jason.encode()
    else
      nil -> {:error, "could not find cluster with handle #{handle}"}
      error -> error
    end
  end

  defp maybe_search(query, q) when is_binary(q) and q != "", do: Service.search(query, q)
  defp maybe_search(query, _), do: query

  defp service_brief(%Service{} = s) do
    %{
      id: s.id,
      name: s.name,
      namespace: s.namespace,
      status: s.status,
      sha: s.sha,
      cluster_id: s.cluster_id,
      cluster_handle: s.cluster && s.cluster.handle
    }
  end
end
