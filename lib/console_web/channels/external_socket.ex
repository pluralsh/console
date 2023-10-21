defmodule ConsoleWeb.ExternalSocket do
  use Phoenix.Socket
  alias Console.Schema.Cluster

  channel "cluster:*", ConsoleWeb.ClusterChannel

  def connect(params, socket) do
    case build_context(params) do
      {:ok, context} ->
        socket = assign(socket, :cluster_id, context.cluster.id)
        socket = assign(socket, :cluster, context.cluster)
        {:ok, Absinthe.Phoenix.Socket.put_options(socket, context: context)}
      _ -> {:error, :unauthorized}
    end
  end

  def build_context(params) do
    with {:ok, token} <- fetch_token(params),
          %Cluster{} = cluster <- Console.Deployments.Clusters.get_by_deploy_token(token) do
      {:ok, %{cluster: cluster}}
    end
  end

  def fetch_token(%{"token" => deploy_token}), do: {:ok, deploy_token}
  def fetch_token(_), do: {:error, :notoken}

  def id(_socket), do: nil
end
