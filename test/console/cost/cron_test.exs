defmodule Console.Cost.CronTest do
  use Console.DataCase, async: true
  alias Console.Cost.Cron
  alias Console.Schema.ClusterUsageHistory

  describe "#history/0" do
    test "it can upsert history records from cluster usage" do
      usages = insert_list(3, :cluster_usage)

      Cron.history()

      history = Console.Repo.all(ClusterUsageHistory)

      assert length(history) == 3

      assert MapSet.new(usages, & &1.cluster_id)
             |> MapSet.equal?(MapSet.new(history, & &1.cluster_id))
    end
  end

  describe "#prune/0" do
    test "it can prune old history records" do
      hist = insert_list(3, :cluster_usage_history, timestamp: Timex.now() |> Timex.shift(days: -30))
      keep = insert_list(3, :cluster_usage_history)

      Cron.prune()

      for h <- hist,
        do: refute refetch(h)

      for h <- keep,
        do: assert refetch(h)
    end
  end
end
