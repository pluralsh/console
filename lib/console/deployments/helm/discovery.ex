defmodule Console.Deployments.Helm.Discovery do
  alias Console.Deployments.Helm.{Supervisor, Agent}

  def agent(url) do
    case maybe_rpc(url, Supervisor, :start_child, [url]) do
      {:ok, pid} -> {:ok, pid}
      {:error, {:already_started, pid}} -> {:ok, pid}
      err -> err
    end
  end

  def fetch(url, chart, vsn) do
    with {:ok, pid} <- agent(url),
      do: Agent.fetch(pid, chart, vsn)
  end

  def digest(url, chart, vsn) do
    with {:ok, pid} <- agent(url),
      do: Agent.digest(pid, chart, vsn)
  end

  defp maybe_rpc(id, module, func, args) do
    me = node()
    case worker_node(id) do
      ^me -> apply(module, func, args)
      node -> :rpc.call(node, module, func, args)
    end
  end

  def worker_node(url), do: HashRing.key_to_node(ring(), url)

  def local?(url), do: worker_node(url) == node()

  defp ring() do
    HashRing.new()
    |> HashRing.add_nodes([node() | Node.list()])
  end
end
