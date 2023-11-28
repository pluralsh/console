defmodule Console.Deployments.PubSub.Pipeline do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.Deployments.PubSub.Pipelineable
  alias Console.Schema.{PipelineStage, PipelinePromotion}
  alias Console.Deployments.Pipelines.Discovery


  def handle_event(event) do
    case Pipelineable.pipe(event) do
      [_ | _] = items -> Enum.map(items, &act/1)
      %PipelineStage{} = stage -> Discovery.stage(stage)
      %PipelinePromotion{} = promo -> Discovery.promotion(promo)
      _ -> :ok
    end
  end

  defp act(%PipelineStage{} = stage), do: Discovery.stage(stage)
  defp act(%PipelinePromotion{} = promo), do: Discovery.promotion(promo)
end
