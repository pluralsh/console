defmodule Console.Deployments.Pipelines.PromotionWorker do
  use GenServer
  require Logger
  alias Console.Deployments.Pipelines.Supervisor
  alias Console.Schema.PipelinePromotion
  alias Console.Deployments.Pipelines

  def start_link([shard]) do
    GenServer.start_link(__MODULE__, :ok, name: name(shard))
  end

  def init(_) do
    {:ok, %{}}
  end

  def dispatch(shard, %PipelinePromotion{} = promo),
    do: GenServer.cast(name(shard), promo)

  def name(shard), do: {:via, Registry, {Supervisor.registry(), {:promotion, :shard, shard}}}

  def handle_cast(%PipelinePromotion{} = promo, state) do
    case Pipelines.apply_promotion(promo) do
      {:ok, _} -> Logger.info "promotion #{promo.id} applied successfully"
      {:error, err} -> Logger.info "failed to apply promotion #{promo.id} reason: #{inspect(err)}"
    end
    {:noreply, state}
  end
end
