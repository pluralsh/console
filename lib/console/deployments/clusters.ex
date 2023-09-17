defmodule Console.Deployments.Clusters do
  use Console.Services.Base
  alias Console.Deployments.Services
  alias Console.Schema.{Cluster, User, ClusterProvider, Service}

  @type cluster_resp :: {:ok, Cluster.t} | Console.error
  @type cluster_provider_resp :: {:ok, ClusterProvider.t} | Console.error

  def get_cluster(id), do: Console.Repo.get(Cluster, id)

  def get_cluster!(id), do: Console.Repo.get!(Cluster, id)

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
    |> add_operation(:cluster_service, fn %{cluster: cluster} ->
      case Console.Repo.preload(cluster, [:provider]) do
        %{provider: %ClusterProvider{}} = cluster -> Services.cluster_service(cluster, user)
        _ -> {:ok, cluster}
      end
    end)
    |> add_operation(:rewire, fn
      %{cluster_service: %Cluster{} = cluster} -> {:ok, cluster}
      %{cluster_service: %Service{id: id}, cluster: cluster} ->
        Ecto.Changeset.change(cluster, %{service_id: id})
        |> Console.Repo.update()
    end)
    |> execute(extract: :rewire)
  end

  @doc """
  modifies rbac settings for this cluster
  """
  @spec rbac(map, binary, User.t) :: cluster_resp
  def rbac(attrs, cluster_id, %User{}) do
    get_cluster!(cluster_id)
    |> Cluster.rbac_changeset(attrs)
    |> Console.Repo.update()
  end

  @spec create_provider(map, User.t) :: cluster_provider_resp
  def create_provider(attrs, %User{}) do
    %ClusterProvider{}
    |> ClusterProvider.changeset(attrs)
    |> Console.Repo.insert()
  end
end
