defmodule Console.Deployments.Helm.Discovery do
  alias Console.Deployments.Helm.{Supervisor, Agent}

  def fetch(url, chart, vsn) do
    maybe_rpc(url, fn pid -> Agent.fetch(pid, chart, vsn) end)
  end

  def digest(url, chart, vsn) do
    maybe_rpc(url, fn pid -> Agent.digest(pid, chart, vsn) end)
  end

  defp maybe_rpc(url, fun) when is_function(fun, 1) do
    me = node()
    case worker_node(url) do
      ^me -> start_and_run(url, fun)
      node -> :erpc.call(node, __MODULE__, :start_and_run, [url, fun], :timer.seconds(30))
    end
  end

  def start_and_run(url, fun) when is_function(fun, 1) do
    case Supervisor.start_child(url) do
      {:ok, pid} -> fun.(pid)
      {:error, {:already_started, pid}} -> fun.(pid)
      err -> err
    end
  end
  def start_and_run(_, _), do: {:error, "no helm repository located"}

  def worker_node(url), do: HashRing.key_to_node(ring(), url)

  def local?(url), do: worker_node(url) == node()

  defp ring() do
    HashRing.new()
    |> HashRing.add_nodes([node() | Node.list()])
  end
end
