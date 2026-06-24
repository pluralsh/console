defmodule Console.AI.Workbench.Heartbeat do
  use GenServer
  alias Console.Schema.WorkbenchJob
  alias Console.Deployments.Workbenches
  alias Console.AI.Agents

  @poll :timer.seconds(15)

  defmodule State do
    defstruct [:job, booted: false, usage: %{}]
  end

  def start_link(%WorkbenchJob{} = job) do
    GenServer.start_link(__MODULE__, job, name: via(job))
  end

  def kill(%WorkbenchJob{} = job), do: GenServer.cast(via(job), :cancel)

  def init(job) do
    Process.flag(:trap_exit, true)
    :timer.send_interval(@poll, :heartbeat)
    {:ok, %State{job: job, booted: true, usage: preserve_usage(job)}}
  end

  def handle_cast({:usage, %{} = new_usage}, %State{usage: usage} = state) do
    usage = Enum.reduce(new_usage, usage, fn {k, v}, acc ->
      case Map.get(acc, k) do
        old when is_integer(old) or is_float(old) -> Map.put(acc, k, old + v)
        _ -> Map.put(acc, k, v)
      end
    end)

    {:noreply, %State{state | usage: usage}}
  end
  def handle_cast(:cancel, %State{job: job, booted: booted} = state),
    do: {:stop, :cancel, %{state | job: job, booted: booted}}
  def handle_cast(_, state), do: {:noreply, state}

  def handle_info({:EXIT, _, _}, state), do: {:stop, :shutdown, state}

  def handle_info(:heartbeat, %State{job: job, booted: booted} = state) do
    case Workbenches.heartbeat(job, booted) do
      {:ok, %WorkbenchJob{status: :cancelled}} -> {:stop, :cancel, %{state | job: job, booted: false}}
      {:ok, %WorkbenchJob{} = job} -> {:noreply, %{state | job: job, booted: false}}
      _ -> {:noreply, %{state | job: job, booted: false}}
    end
  end

  def terminate(:cancel, _), do: :ok
  def terminate(:shutdown, %State{job: job, usage: usage}), do: Workbenches.pause_job(job, usage)
  def terminate(_, %State{job: job, usage: usage}) do
    case Workbenches.get_workbench_job(job.id) do
      %WorkbenchJob{status: :running} = job -> Workbenches.fail_job("job crashed prematurely", job, usage)
      _ -> Workbenches.save_usage(job, usage)
    end
  end

  defp preserve_usage(%WorkbenchJob{usage: %{} = usage}), do: Console.mapify(usage)
  defp preserve_usage(_), do: %{}

  def usage_callback(%WorkbenchJob{} = job, usage), do: GenServer.cast(via(job), {:usage, usage})

  defp via(%WorkbenchJob{id: id}), do: {:via, Registry, {Agents, {:workbench_heartbeat, id}}}
end
