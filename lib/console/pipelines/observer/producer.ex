defmodule Console.Pipelines.Observer.Producer do
  use Console.Pipelines.PollProducer
  alias Console.Schema.Observer

  def poll(demand) do
    Observer.runnable()
    |> Observer.with_limit(limit(demand))
    |> Repo.all()
  end
end
