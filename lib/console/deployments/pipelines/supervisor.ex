defmodule Console.Deployments.Pipelines.Supervisor do
  use Supervisor
  alias Console.Deployments.Pipelines.{StageWorker, PromotionWorker, Discovery}

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    shards = Discovery.shards()
    promos = Enum.map(0..shards, & {PromotionWorker, [&1]})
    stages = Enum.map(0..shards, & {StageWorker, [&1]})
    Supervisor.init(promos ++ stages, strategy: :one_for_one, max_restarts: 15)
  end
end
