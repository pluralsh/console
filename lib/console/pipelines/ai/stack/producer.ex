defmodule Console.Pipelines.AI.Stack.Producer do
  use Console.Pipelines.PollProducer
  import Console.Pipelines.AI.Base
  alias Console.Schema.Stack

  def poll(demand) do
    if_enabled(fn ->
      Stack.for_status(:failed)
      |> Stack.ai_pollable()
      |> Stack.with_limit(limit(demand))
      |> Repo.all()
    end)
  end
end
