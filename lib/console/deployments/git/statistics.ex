defmodule Console.Deployments.Git.Statistics do
  import Console.Prom.Plugin, only: [metric_scope: 1]

  def disk() do
    {count, size} =
      :ets.tab2list(Briefly.Entry.Dir)
      |> Enum.map(fn {_pid, dir} -> dir end)
      |> Enum.reduce({0, 0}, fn dir, {count, size} ->
        {dc, ds} = Console.df(dir)
        {count + dc, size + ds}
      end)

    :telemetry.execute(metric_scope(:file_count), %{total: count}, %{})
    :telemetry.execute(metric_scope(:file_size), %{total: size}, %{})
  end
end
