defmodule Console.Pipelines.Sentinel.Producer do
  use Console.Pipelines.PollProducer
  alias Console.Schema.Sentinel

  def poll(demand) do
    Sentinel.pollable()
    |> Sentinel.ordered(asc: :next_run_at)
    |> Sentinel.with_limit(limit(demand))
    |> Repo.all()
  end
end
