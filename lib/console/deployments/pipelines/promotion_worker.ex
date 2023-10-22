defmodule Console.Deployments.Pipelines.PromotionWorker do
  use GenServer
  alias Console.Schema.PipelinePromotion

  def start(shard) do
    GenServer.start(__MODULE__, :ok, name: name(shard))
  end

  def start_link(shard) do
    GenServer.start_link(__MODULE__, :ok, name: name(shard))
  end

  def init(_) do
    {:ok, %{}}
  end

  def dispatch(shard, %PipelinePromotion{} = promo) do
    GenServer.cast(name(shard), promo)
  end

  def name(shard), do: {:promotion, :shard, shard}

  def handle_cast(%PipelinePromotion{}, state) do

    {:noreply, state}
  end
end
