defmodule Console.AI.Worker do
  alias Console.AI.Memoizer

  defstruct [:owner, :monitor, :ref, :pid]

  def generate(%{id: id} = struct),
    do: maybe_rpc(id, fn -> Memoizer.generate(struct) end)

  def spawn(from, fun) do
    ref = make_ref()
    pid = spawn(fn ->
      send(from, {:result, ref, fun.()})
    end)
    %__MODULE__{owner: from, ref: ref, pid: pid}
  end

  def await(%__MODULE__{ref: ref, monitor: monitor}, timeout \\ 300_000) do
    receive do
      {:result, ^ref, reply} ->
        Process.demonitor(monitor, [:flush])
        reply

      {:DOWN, ^monitor, _, _, reason} ->
        {:error, {:died, reason}}
    after
      timeout ->
        Process.demonitor(monitor, [:flush])
        {:error, :timeout}
    end
  end

  defp maybe_rpc(id, func) do
    me = node()
    pid = self()
    case worker_node(id) do
      ^me -> spawn(pid, func)
      node -> :rpc.call(node, __MODULE__, :spawn, [pid, func])
    end
    |> monitor()
  end

  defp monitor(%__MODULE__{pid: pid} = worker) do
    ref = Process.monitor(pid)
    %{worker | monitor: ref}
  end

  defp worker_node(id), do: Console.ClusterRing.node(id)
end
