defmodule Console.AI.Worker do
  alias Console.AI.Memoizer

  defstruct [:owner, :monitor, :ref, :pid]

  def generate(%{id: id} = struct) do
    me = node()
    case Console.ClusterRing.node(id) do
      ^me -> Console.AI.TaskSupervisor
      node -> {Console.AI.TaskSupervisor, node}
    end
    |> Task.Supervisor.async(Memoizer, :generate, [struct])
  end

  def await(task, timeout \\ 300_000), do: Task.await(task, timeout)
end
