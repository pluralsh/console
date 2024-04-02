defmodule Console.Deployments.Git.Statistics do
  alias Console.Prom.Metrics

  def disk() do
    {count, size} =
      :ets.tab2list(Briefly.Entry.Dir)
      |> Enum.map(fn {_pid, dir} -> dir end)
      |> Enum.reduce({0, 0}, fn dir, {count, size} ->
        {dc, ds} = Console.df(dir)
        {count + dc, size + ds}
      end)

    Metrics.filecache(count, size)
  end
end
