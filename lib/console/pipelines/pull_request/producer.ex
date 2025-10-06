defmodule Console.Pipelines.PullRequest.Producer do
  use Console.Pipelines.PollProducer
  alias Console.Schema.PullRequest

  def poll(demand) do
    PullRequest.mergeable()
    |> PullRequest.with_limit(limit(demand))
    |> Repo.all()
  end
end
