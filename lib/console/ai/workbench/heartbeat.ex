defmodule Console.AI.Workbench.Heartbeat do
  use GenServer
  alias Console.Schema.{AIUsage, WorkbenchJob}
  alias Console.Schema.WorkbenchJob.{Modes, Modes.Budget}
  alias Console.Deployments.Workbenches
  alias Console.AI.{Agents, ModelSelection}

  require Logger

  @poll :timer.minutes(1)
  @timeout :timer.hours(4)

  defmodule State do
    defstruct [:job, reprompt: false, booted: false, usage: %{}]
  end

  def start_link(%WorkbenchJob{} = job) do
    case GenServer.start_link(__MODULE__, job, name: via(job)) do
      {:ok, pid} -> {:ok, pid}
      {:error, {:already_started, pid}} -> {:ok, pid}
      err -> err
    end
  end

  def kill(%WorkbenchJob{} = job), do: GenServer.cast(via(job), :cancel)

  def init(job) do
    Process.flag(:trap_exit, true)
    :timer.send_interval(@poll, :heartbeat)
    Process.send_after(self(), :timeout, @timeout)
    {:ok, %State{job: job, booted: true, usage: preserve_usage(job.usage), reprompt: reprompt(job)}}
  end

  def handle_cast({:usage, %{} = new_usage, _provider, _model, price_sheet}, %State{usage: usage} = state) do
    new_usage
    |> ModelSelection.backfill_usage(price_sheet)
    |> merge_usage(usage)
    |> enforce_budget(state)
  end
  def handle_cast({:usage, %{} = new_usage}, %State{usage: usage} = state) do
    new_usage
    |> AIUsage.sanitize()
    |> merge_usage(usage)
    |> enforce_budget(state)
  end
  def handle_cast(:cancel, %State{job: job, booted: booted} = state),
    do: {:stop, {:shutdown, :cancel}, %{state | job: job, booted: booted}}
  def handle_cast(_, state), do: {:noreply, state}

  defp merge_usage(new_usage, usage) do
    Enum.reduce(new_usage, usage, fn {k, v}, acc ->
      case Map.get(acc, k) do
        old when (is_integer(old) or is_float(old)) and (is_integer(v) or is_float(v)) ->
          Map.put(acc, k, old + v)

        _ -> Map.put(acc, k, v)
      end
    end)
  end

  def handle_info({:EXIT, _, _}, state), do: {:stop, :shutdown, state}
  def handle_info(:timeout, state), do: {:stop, :timeout, state}

  def handle_info(:heartbeat, %State{job: job, booted: booted} = state) do
    case Workbenches.heartbeat(job, booted) do
      {:ok, %WorkbenchJob{status: :cancelled}} -> {:stop, {:shutdown, :cancel}, %{state | job: job, booted: false}}
      {:ok, %WorkbenchJob{} = job} -> {:noreply, %{state | job: job, booted: false}}
      _ -> {:noreply, %{state | job: job, booted: false}}
    end
  end

  def terminate({:shutdown, :cancel}, %State{job: job, usage: usage}), do: Workbenches.save_usage(job, usage)
  def terminate(:normal, %State{job: job, usage: usage}), do: Workbenches.save_usage(job, usage)
  def terminate(:shutdown, %State{job: job, usage: usage}), do: Workbenches.pause_job(job, usage)
  def terminate(:timeout, %State{job: job, usage: usage}),
    do: Workbenches.fail_job("Workbench timed out after 4 hours", job, usage)
  def terminate({:shutdown, {:budget, dim, val}}, %State{job: job, usage: usage}),
    do: Workbenches.fail_job("Budget exceeded, #{dim} consumption of #{val} exceeded limit", job, usage)
  def terminate(reason, %State{job: job, usage: usage}) do
    case Workbenches.get_workbench_job(job.id) do
      %WorkbenchJob{status: :running} = job ->
        Logger.error("Job crashed prematurely: #{inspect(reason)}")
        Workbenches.fail_job("job crashed prematurely", job, usage)
      _ -> Workbenches.save_usage(job, usage)
    end
  end

  defp enforce_budget(usage, %State{reprompt: true} = state), do: {:noreply, %{state | usage: usage}}
  defp enforce_budget(%{total_tokens: tts} = usage, %State{job: %WorkbenchJob{modes: %Modes{budget: %Budget{tokens: lim}}}} = s)
    when is_integer(tts) and is_integer(lim) and tts >= lim,
    do: {:stop, {:shutdown, {:budget, :tokens, tts}}, %{s | usage: usage}}
  defp enforce_budget(%{total_cost: tc} = usage, %State{job: %WorkbenchJob{modes: %Modes{budget: %Budget{cost: lim}}}} = s)
    when is_float(tc) and is_float(lim) and tc >= lim,
    do: {:stop, {:shutdown, {:budget, :cost, tc}}, %{s | usage: usage}}
  defp enforce_budget(usage, %State{} = state), do: {:noreply, %{state | usage: usage}}

  defp preserve_usage(%{} = usage), do: AIUsage.sanitize(usage)
  defp preserve_usage(_), do: %{}

  defp reprompt(%WorkbenchJob{usage: %{}}), do: true
  defp reprompt(_), do: false

  def usage_callback(%WorkbenchJob{} = job, usage), do: GenServer.cast(via(job), {:usage, usage})
  def usage_callback(%WorkbenchJob{} = job, provider, model, price_sheet, usage),
    do: GenServer.cast(via(job), {:usage, usage, provider, model, price_sheet})

  defp via(%WorkbenchJob{id: id}), do: {:via, Registry, {Agents, {:workbench_heartbeat, id}}}
end
