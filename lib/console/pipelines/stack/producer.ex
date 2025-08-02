defmodule Console.Pipelines.Stack.Producer do
  use Console.Pipelines.PollProducer
  alias Console.Schema.{Stack, PullRequest}

  def poll(demand) do
    Stack.pollable()
    |> Stack.with_limit(limit(demand))
    |> Repo.all()
    |> Enum.concat(
      PullRequest.pollable()
      |> PullRequest.stack()
      |> PullRequest.open()
      |> PullRequest.with_limit(limit(demand))
      |> Repo.all()
    )
  end
end
