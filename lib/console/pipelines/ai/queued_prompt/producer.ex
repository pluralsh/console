defmodule Console.Pipelines.AI.QueuedPrompt.Producer do
  use Console.Pipelines.PollProducer
  import Console.Pipelines.AI.Base
  alias Console.Schema.QueuedPrompt

  def poll(demand) do
    if_enabled(fn ->
      QueuedPrompt.dequeueable()
      |> QueuedPrompt.with_limit(limit(demand))
      |> Repo.all()
    end)
  end
end
