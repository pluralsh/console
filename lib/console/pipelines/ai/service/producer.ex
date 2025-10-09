defmodule Console.Pipelines.AI.Service.Producer do
  use Console.Pipelines.PollProducer
  import Console.Pipelines.AI.Base
  alias Console.Schema.Service

  def poll(demand) do
    if_enabled(fn ->
      Service.for_statuses([:failed, :stale])
      |> Service.stable()
      |> Service.ai_pollable()
      |> Service.with_limit(limit(demand))
      |> Repo.all()
    end)
  end
end
