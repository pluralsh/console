defmodule Console.Pipelines.Sentinel.Producer do
  use Console.Pipelines.PollProducer
  alias Console.Schema.SentinelRun
  require Logger

  def poll(demand) do
    SentinelRun.unpolled()
    |> SentinelRun.ordered(asc: :inserted_at)
    |> SentinelRun.with_limit(limit(demand))
    |> Repo.all()
  end
end
