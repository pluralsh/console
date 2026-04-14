defmodule Console.AI.Workbench.Heartbeat do
  use GenServer
  alias Console.Schema.WorkbenchJob
  alias Console.Deployments.Workbenches
  alias Console.AI.Agents

  @poll :timer.seconds(15)

  def start_link(%WorkbenchJob{} = job) do
    GenServer.start_link(__MODULE__, job, name: via(job))
  end

  def kill(%WorkbenchJob{} = job), do: GenServer.cast(via(job), :cancel)

  def init(job) do
    Process.flag(:trap_exit, true)
    :timer.send_interval(@poll, :heartbeat)
    {:ok, {job, true}}
  end

  def handle_cast(:cancel, {job, booted}), do: {:stop, :cancel, {job, booted}}

  def handle_info(:heartbeat, {job, booted}) do
    case Workbenches.heartbeat(job, booted) do
      {:ok, %WorkbenchJob{status: :cancelled}} -> {:stop, :cancel, {job, false}}
      {:ok, %WorkbenchJob{} = job} -> {:noreply, {job, false}}
      _ -> {:noreply, {job, false}}
    end
  end

  def terminate(:cancel, _), do: :ok
  def terminate(_, {job, _}) do
    case Workbenches.get_workbench_job(job.id) do
      %WorkbenchJob{status: :running} = job -> Workbenches.fail_job("job crashed prematurely",job)
      _ -> :ok
    end
  end

  defp via(%WorkbenchJob{id: id}), do: {:via, Registry, {Agents, {:workbench_heartbeat, id}}}
end
