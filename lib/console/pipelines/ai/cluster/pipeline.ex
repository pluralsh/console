defmodule Console.Pipelines.AI.Cluster.Pipeline do
  use Flow
  import Console.Pipelines.AI.Base
  alias Console.PubSub

  def start_link(producer) do
    Flow.from_stages([producer], stages: 15, max_demand: 2)
    |> process_insights(PubSub.ClusterInsight)
    |> Flow.start_link()
  end
end
