defmodule Console.Pipelines.AI.Service.Pipeline do
  use Console.Pipelines.Consumer, demand: 20
  import Console.Pipelines.AI.Base
  alias Console.PubSub

  def handle_event(event), do: process_insights(event, PubSub.ServiceInsight)
end
