defmodule Console.Deployments.Pipelines.StageWorker do
  use GenServer
  require Logger
  alias Console.Deployments.Pipelines.Supervisor
  alias Console.Deployments.Pipelines
  alias Console.Schema.PipelineStage

  @poll :timer.minutes(2)

  def start_link([shard]) do
    GenServer.start_link(__MODULE__, :ok, name: name(shard))
  end

  def init(_) do
    :timer.send_interval(@poll, :cleanup)
    {:ok, %{}}
  end

  def dispatch(shard, %PipelineStage{} = stage),
    do: GenServer.cast(name(shard), stage)

  def context(shard, %PipelineStage{} = stage),
    do: GenServer.cast(name(shard), {:context, stage})

  def name(shard), do: {:via, Registry, {Supervisor.registry(), {:stage, :shard, shard}}}

  def handle_cast({:context, stage}, state) do
    case Pipelines.apply_pipeline_context(stage) do
      {:ok, _} -> Logger.info "stage #{stage.id} context applied successfully"
      {:error, err} ->
        Logger.info "failed to apply stage context #{stage.id} reason: #{inspect(err)}"
        Pipelines.add_stage_error(stage, "context", "Failed to apply stage context with error: #{format_error(err)}")
    end
    {:noreply, state}
  end

  defp format_error(err) when is_binary(err), do: "\n#{err}"
  defp format_error(err), do: inspect(err)

  def handle_cast(%PipelineStage{} = stage, state) do
    case Pipelines.build_promotion(stage) do
      {:ok, _} -> Logger.info "stage #{stage.id} applied successfully"
      {:error, err} -> Logger.info "failed to apply stage #{stage.id} reason: #{inspect(err)}"
    end
    {:noreply, state}
  end

  def handle_info(:cleanup, state) do
    Briefly.cleanup()
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}
end
