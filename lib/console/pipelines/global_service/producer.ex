defmodule Console.Pipelines.GlobalService.Producer do
  use Console.Pipelines.PollProducer
  alias Console.Schema.GlobalService

  def poll(demand) do
    GlobalService.pollable()
    |> GlobalService.with_limit(limit(demand))
    |> Repo.all()
  end
end
