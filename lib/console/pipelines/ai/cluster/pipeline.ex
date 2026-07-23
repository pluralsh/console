defmodule Console.Pipelines.AI.Cluster.Pipeline do
  use Console.Pipelines.Consumer, demand: 10
  import Console.Pipelines.AI.Base
  alias Console.PubSub

  def handle_event(event), do: process_insights(event, PubSub.ClusterInsight)
end
