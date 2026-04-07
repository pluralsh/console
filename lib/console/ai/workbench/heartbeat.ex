defmodule Console.AI.Workbench.Heartbeat do
  use GenServer
  alias Console.Schema.WorkbenchJob
  alias Console.Deployments.Workbenches

  @poll :timer.seconds(15)

  def start_link(%WorkbenchJob{} = job) do
    GenServer.start_link(__MODULE__, job)
  end

  def init(job) do
    :timer.send_interval(@poll, :heartbeat)
    send self(), :heartbeat
    {:ok, job}
  end

  def handle_info(:heartbeat, job) do
    case Workbenches.heartbeat(job) do
      {:ok, %WorkbenchJob{status: :cancelled}} -> {:stop, :normal, job}
      {:ok, %WorkbenchJob{} = job} -> {:noreply, job}
      _ -> {:noreply, job}
    end
  end
end
