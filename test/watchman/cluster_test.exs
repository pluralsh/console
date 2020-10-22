defmodule Watchman.Commands.ClusterTest do
  use ExUnit.Case

  describe "#apply/0" do
    test "It will maintain a single global process" do
      boot = Process.whereis(Watchman.Bootstrapper)
      :erlang.trace(boot, true, [:receive, :send])

      {:ok, pid, _} = Watchman.Cluster.call(:fetch)
      assert is_pid(pid)
      assert Process.alive?(pid)
      Process.exit(pid, :kill)

      assert_receive {:trace, ^boot, :receive, :finish}, 1000

      {:ok, new_pid, _} = Watchman.Cluster.call(:fetch)
      assert is_pid(new_pid)
      assert new_pid != pid
      assert Process.alive?(new_pid)
    end
  end
end