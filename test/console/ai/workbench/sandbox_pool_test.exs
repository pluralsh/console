defmodule Console.AI.Workbench.SandboxPoolTest do
  use ExUnit.Case, async: false
  alias Console.AI.Workbench.SandboxPool

  test "runs the function in the caller and returns its result" do
    me = self()
    assert SandboxPool.run(fn -> self() end, 1_000) == me
  end

  test "it returns busy once every permit is held, and frees permits of callers that die" do
    holders = for _ <- 1..SandboxPool.size(), do: hold()

    assert SandboxPool.run(fn -> :ran end, 100) == {:error, :busy}

    # queue a waiter before the permit frees up, so it has to be woken rather than served on arrival
    waiter = Task.async(fn -> SandboxPool.run(fn -> :ran end, 1_000) end)
    Process.sleep(50)

    [holder | rest] = holders
    Process.exit(holder, :kill)
    assert Task.await(waiter) == :ran

    Enum.each(rest, &Process.exit(&1, :kill))
  end

  defp hold() do
    me = self()
    pid = spawn(fn ->
      SandboxPool.run(fn ->
        send(me, {:holding, self()})
        Process.sleep(:infinity)
      end, 1_000)
    end)

    assert_receive {:holding, ^pid}
    pid
  end
end
