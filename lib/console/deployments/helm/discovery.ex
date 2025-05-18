defmodule Console.Deployments.Helm.Discovery do
  alias Console.SmartFile
  alias Console.Deployments.Helm.{Supervisor, Agent}
  alias Console.Deployments.Local.Server

  @type error :: Console.error

  @spec fetch(binary, binary, binary) :: {:ok, SmartFile.t, binary} | error
  def fetch(url, chart, vsn) do
    with {:ok, f, sha, digest} <- maybe_rpc(url, &Agent.fetch(&1, chart, vsn)),
         {:ok, f} <- Server.proxy(digest, f),
      do: {:ok, f, sha}
  end

  @spec digest(binary, binary, binary) :: {:ok, binary} | error
  def digest(url, chart, vsn), do: maybe_rpc(url, &Agent.digest(&1, chart, vsn))

  defp maybe_rpc(url, fun) when is_function(fun, 1) do
    me = node()
    case worker_node(url) do
      ^me -> start_and_run(url, fun)
      node ->
        :erpc.call(node, __MODULE__, :start_and_run, [url, fun], :timer.seconds(30))
        |> Console.handle_rpc()
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
