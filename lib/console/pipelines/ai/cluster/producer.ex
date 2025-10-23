defmodule Console.Pipelines.AI.Cluster.Producer do
  use Console.Pipelines.PollProducer
  import Console.Pipelines.AI.Base
  alias Console.Schema.Cluster

  def poll(demand) do
    if_enabled(fn ->
      Cluster.with_insight_components()
      |> Cluster.ai_pollable()
      |> Cluster.health(true)
      |> Cluster.preloaded([:insight, insight_components: [:insight, :cluster]])
      |> Cluster.with_limit(limit(demand))
      |> Repo.all()
    end)
  end
end
