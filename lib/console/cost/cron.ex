defmodule Console.Cost.Cron do
  import Console.Services.Base
  import Console.Cost.Utils, only: [batch_insert: 2]
  alias Console.Repo
  alias Console.Schema.{ClusterUsage, ClusterUsageHistory}

  def history() do
    timestamp = Timex.now()
                |> DateTime.truncate(:second)
                |> truncate()

    ClusterUsage
    |> ClusterUsage.ordered(asc: :id)
    |> Repo.stream(method: :keyset)
    |> Stream.map(&Map.take(&1, ClusterUsageHistory.fields()))
    |> Stream.map(&timestamped/1)
    |> Stream.map(&Map.put(&1, :timestamp, timestamp))
    |> batch_insert(ClusterUsageHistory)
  end

  def prune() do
    ClusterUsageHistory.expired()
    |> Repo.delete_all()
  end

  defp truncate(%DateTime{} = dt), do: %{dt | minute: 0, hour: 0, microsecond: {0, 6}, second: 0}
end
