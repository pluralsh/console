defmodule Console.Deployments.Clusters do
  use Console.Services.Base
  alias Console.Deployments.Services
  alias Console.Schema.{Cluster, User, ClusterProvider, Service}

  @type cluster_resp :: {:ok, Cluster.t} | Console.error
  @type cluster_provider_resp :: {:ok, ClusterProvider.t} | Console.error

  def get_cluster(id), do: Console.Repo.get(Cluster, id)

  def get_by_deploy_token(token), do: Console.Repo.get_by(Cluster, deploy_token: token)

  def local_cluster(), do: Console.Repo.get_by!(Cluster, self: true)

  def services(%Cluster{id: id}) do
    Service.for_cluster(id)
    |> Console.Repo.all()
  end

  @doc """
  creates a new cluster and a service alongside to deploy the cluster via CAPI
  """
  @spec create_cluster(map, User.t) :: cluster_resp
  def create_cluster(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:cluster, fn _ ->
      %Cluster{}
      |> Cluster.changeset(attrs)
      |> Console.Repo.insert()
    end)
    |> add_operation(:service, fn %{cluster: cluster} ->
      Services.operator_service(cluster.deploy_token, cluster.id, user)
    end)
    |> execute(extract: :cluster)
  end

  @spec create_provider(map, User.t) :: cluster_provider_resp
  def create_provider(attrs, %User{}) do
    %ClusterProvider{}
    |> ClusterProvider.changeset(attrs)
    |> Console.Repo.insert()
  end
end
