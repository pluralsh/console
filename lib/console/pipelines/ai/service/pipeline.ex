defmodule Console.Pipelines.AI.Service.Pipeline do
  use Console.Pipelines.Consumer
  import Console.Pipelines.AI.Base
  alias Console.PubSub

  def handle_event(event), do: process_insights(event, PubSub.ServiceInsight)
end
