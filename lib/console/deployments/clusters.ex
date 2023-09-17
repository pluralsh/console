defmodule Console.Deployments.Clusters do
  use Console.Services.Base
  alias Console.Schema.{Cluster, User}

  @type cluster_resp :: {:ok, Cluster.t} | Console.error

  def get_cluster(id), do: Console.Repo.get(Cluster, id)

  def get_by_deploy_token(token), do: Console.Repo.get_by(Cluster, deploy_token: token)

  @doc """
  creates a new cluster and a service alongside to deploy the cluster via CAPI
  """
  @spec create_cluster(map, User.t) :: cluster_resp
  def create_cluster(attrs, %User{}) do
    %Cluster{}
    |> Cluster.changeset(attrs)
    |> Console.Repo.insert()
  end
end
