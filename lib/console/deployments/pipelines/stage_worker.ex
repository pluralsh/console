defmodule Console.Deployments.Pipelines.StageWorker do
  use GenServer
  require Logger
  alias Console.Deployments.Pipelines.Supervisor
  alias Console.Deployments.Pipelines
  alias Console.Schema.PipelineStage

  def start_link([shard]) do
    GenServer.start_link(__MODULE__, :ok, name: name(shard))
  end

  def init(_), do: {:ok, %{}}

  def dispatch(shard, %PipelineStage{} = stage),
    do: GenServer.cast(name(shard), stage)

  def name(shard), do: {:via, Registry, {Supervisor.registry(), {:stage, :shard, shard}}}

  def handle_cast(%PipelineStage{} = stage, state) do
    case Pipelines.build_promotion(stage) do
      {:ok, _} -> Logger.info "stage #{stage.id} applied successfully"
      {:error, err} -> Logger.info "failed to apply stage #{stage.id} reason: #{inspect(err)}"
    end
    {:noreply, state}
  end
end
