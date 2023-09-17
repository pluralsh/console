defmodule Console.GraphQl.Resolvers.Deployments do
  use Console.GraphQl.Resolvers.Base, model: Console.Schema.Cluster
  alias Console.Schema.{Cluster, ClusterNodePool, Revision, ClusterProvider, Service, ServiceComponent, GitRepository}
  alias Console.Deployments.{Clusters, Services, Git}

  def query(ClusterNodePool, _), do: ClusterNodePool
  def query(ClusterProvider, _), do: ClusterProvider
  def query(Service, _), do: Service
  def query(Revision, _), do: Revision
  def query(ServiceComponent, _), do: ServiceComponent
  def query(GitRepository, _), do: GitRepository
  def query(_, _), do: Cluster

  def list_clusters(args, _) do
    Cluster.ordered()
    |> paginate(args)
  end

  def list_services(%{cluster_id: cluster_id} = args, _) do
    Service.for_cluster(cluster_id)
    |> Service.ordered()
    |> paginate(args)
  end

  def cluster_services(_, %{context: %{cluster: %{id: id}}}) do
    Service.for_cluster(id)
    |> Service.ordered()
    |> all()
  end

  def list_revisions(%{id: id}, args, _) do
    Revision.for_service(id)
    |> Revision.ordered()
    |> paginate(args)
  end

  def list_git_repositories(args, _) do
    GitRepository.ordered()
    |> paginate(args)
  end

  def resolve_cluster(%{id: id}, _), do: {:ok, Clusters.get_cluster(id)}

  def resolve_git(%{id: id}, _), do: {:ok, Git.get_repository(id)}

  def resolve_service(%{id: id}, _), do: {:ok, Services.get_service!(id)}

  def service_configuration(service, _, _) do
    with {:ok, secrets} <- Services.configuration(service) do
      {:ok, Enum.map(secrets, fn {k, v} -> %{name: k, value: v} end)}
    end
  end

  def create_cluster(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Clusters.create_cluster(attrs, user)

  def create_service(%{attributes: attrs, cluster_id: id}, %{context: %{current_user: user}}),
    do: Services.create_service(attrs, id, user)

  def update_service(%{attributes: attrs, id: id}, %{context: %{current_user: user}}),
    do: Services.update_service(attrs, id, user)

  def delete_service(%{id: id}, %{context: %{current_user: user}}),
    do: Services.delete_service(id, user)

  def update_service_components(%{components: components, id: id}, %{context: %{cluster: cluster}}),
    do: Services.update_components(components, id, cluster)

  def create_git_repository(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Git.create_repository(attrs, user)

  def tarball(svc, _, _), do: {:ok, Services.tarball(svc)}
end
