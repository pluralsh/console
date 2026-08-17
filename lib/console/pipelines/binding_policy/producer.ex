defmodule Console.Pipelines.BindingPolicy.Producer do
  use Console.Pipelines.PollProducer, interval: :timer.minutes(1)
  alias Console.Schema.BindingPolicy

  def poll(demand) do
    BindingPolicy.pollable()
    |> BindingPolicy.with_limit(limit(demand))
    |> Repo.all()
  end
end
