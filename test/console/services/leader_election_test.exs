defmodule Console.Services.LeaderElectionTest do
  use Console.DataCase, async: true
  alias Console.Services.LeaderElection

  describe "elect/2" do
    test "if no leader exists it will elect" do
      {:ok, leader} = LeaderElection.elect(%{ref: self()}, "usa")

      assert leader.name == "usa"
      assert leader.ref == self()
      assert leader.heartbeat
    end

    test "if another leader exists, it will fail" do
      insert(:leader, ref: :else, name: "usa")

      {:error, _} = LeaderElection.elect(%{ref: self()}, "usa")
    end

    test "if a stale leader exists, it will take ownership" do
      insert(:leader, ref: :else, name: "usa", heartbeat: Timex.now() |> Timex.shift(minutes: -1))

      {:ok, leader} = LeaderElection.elect(%{ref: self()}, "usa")

      assert leader.name == "usa"
      assert leader.ref == self()
      assert leader.heartbeat
    end

    test "if you are leader, the hearbeat will be updated" do
      old = insert(:leader, name: "usa", heartbeat: Timex.now() |> Timex.shift(seconds: -10))

      {:ok, leader} = LeaderElection.elect(%{ref: self()}, "usa")

      assert leader.name == "usa"
      assert leader.ref == self()
      assert Timex.after?(leader.heartbeat, old.heartbeat)
    end
  end

  describe "#clear/2" do
    test "if you're leader, it will clear" do
      leader = insert(:leader, name: "usa")

      {:ok, del} = LeaderElection.clear(self(), "usa")

      assert del.id == leader.id
      refute refetch(del)
    end

    test "if you aren't leader, it will ignore" do
      leader = insert(:leader, ref: :other, name: "usa")

      {:error, _} = LeaderElection.clear(self(), "usa")

      assert refetch(leader)
    end
  end
end
