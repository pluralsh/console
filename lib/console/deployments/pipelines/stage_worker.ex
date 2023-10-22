defmodule Console.Deployments.Pipelines.StageWorker do
  use GenServer
  alias Console.Schema.PipelineStage

  def start(shard) do
    GenServer.start(__MODULE__, :ok, name: name(shard))
  end

  def start_link(shard) do
    GenServer.start_link(__MODULE__, :ok, name: name(shard))
  end

  def init(_) do
    {:ok, %{}}
  end

  def dispatch(shard, %PipelineStage{} = stage) do
    GenServer.cast(name(shard), stage)
  end

  def name(shard), do: {:stage, :shard, shard}

  def handle_cast(%PipelineStage{}, state) do

    {:noreply, state}
  end
end
