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
    do: GenServer.call(name(shard), stage)

  def context(shard, %PipelineStage{} = stage),
    do: GenServer.call(name(shard), {:context, stage}, 60_000)

  def revert(shard, %PipelineStage{} = stage),
    do: GenServer.call(name(shard), {:revert, stage}, 60_000)

  def name(shard), do: {:via, Registry, {Supervisor.registry(), {:stage, :shard, shard}}}

  def handle_call({:context, stage}, _, state) do
    Logger.info "starting to apply context for stage #{stage.id} (#{stage.name})"
    case Pipelines.apply_pipeline_context(refetch(stage)) do
      {:ok, _} ->
        Logger.info "stage #{stage.id} context applied successfully"
        {:reply, :ok, state}
      {:error, err} ->
        Logger.info "failed to apply stage context #{stage.id} reason: #{inspect(err)}"
        Pipelines.add_stage_error(stage, "context", "Failed to apply stage context with error: #{format_error(err)}")
        {:reply, :error, state}
    end
  end

  def handle_call({:revert, stage}, _, state) do
    Logger.info "starting to revert context for stage #{stage.id} (#{stage.name})"
    # case Pipelines.revert_pipeline_context(refetch(stage)) do
    #   {:ok, _} ->
    #     Logger.info "stage #{stage.id} context reverted successfully"
    #     {:reply, :ok, state}
    #   {:error, err} ->
    #     Logger.info "failed to revert stage context #{stage.id} reason: #{inspect(err)}"
    #     Pipelines.add_stage_error(stage, "revert", "Failed to apply stage context with error: #{format_error(err)}")
    #     {:reply, :error, state}
    # end
    {:reply, :ok, state}
  end

  def handle_call(%PipelineStage{} = stage, _, state) do
    Logger.info "maybe building promotion for #{stage.id} [#{stage.name}]"
    case Pipelines.build_promotion(stage) do
      {:ok, _} -> Logger.info "stage #{stage.id} promotion applied successfully"
      {:error, err} -> Logger.info "failed to apply stage #{stage.id} reason: #{inspect(err)}"
    end
    {:reply, :ok, state}
  end

  def handle_info(:cleanup, state) do
    Briefly.cleanup()
    {:noreply, state}
  end

  def handle_info(_, state), do: {:noreply, state}

  defp refetch(%PipelineStage{id: id}), do: Console.Repo.get(PipelineStage, id)

  defp format_error(err) when is_binary(err), do: "\n#{err}"
  defp format_error(err), do: inspect(err)
end
