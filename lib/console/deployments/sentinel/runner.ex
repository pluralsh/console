defmodule Console.Deployments.Sentinel.Runner do
  use GenServer
  alias Console.Repo
  alias Console.Schema.{Sentinel, SentinelRun, GitRepository}
  alias Console.Deployments.{Git.Discovery, Tar}
  alias Console.Deployments.Sentinel.Impl

  defmodule State, do: defstruct [:run, checks: %{}, results: %{}]

  def start(%SentinelRun{} = run) do
    GenServer.start(__MODULE__, run)
  end

  def init(%SentinelRun{} = run) do
    Process.flag(:trap_exit, true)
    Process.send_after(self(), :timeout, :timer.minutes(30))
    {:ok, %State{run: run}, {:continue, :boot}}
  end

  def handle_continue(:boot, %State{run: run} = state) do
    case Repo.preload(run, [sentinel: :repository]) do
      %SentinelRun{sentinel: %Sentinel{checks: [_ | _] = checks}} = run ->
        {:ok, rules} = rule_files(run)
        check_runners = Enum.reduce(checks, %{}, fn check, acc ->
          {:ok, pid} = start_check(check, rules)
          Process.monitor(pid)
          Map.put(acc, pid, check)
        end)

        {:noreply, %{state | run: run, checks: check_runners}}
      _ ->
        do_update(%{status: :success}, run)
        {:stop, :normal, state}
    end
  end

  def handle_info({:DOWN, _, :process, pid, _reason}, %State{checks: checks, results: results} = state) do
    case Map.pop(checks, pid) do
      {check, checks} ->
        results = Map.put(results, check.name, %{status: :failed, reason: "Check process ended prematurely"})
        save_results(%{state | checks: checks, results: results})
      _ -> {:noreply, state}
    end
  end

  def handle_info({:status, pid, status}, %State{checks: checks, results: results} = state) do
    case Map.get(checks, pid) do
      {%Sentinel.SentinelCheck{name: name}, checks} ->
        results = Map.put(results, name, status)
        save_results(%{state | results: results, checks: checks})
      _ ->
        {:noreply, state}
    end
  end

  def handle_info(:timeout, %State{run: run}), do: {:stop, :normal, run}
  def handle_info(_, state), do: {:noreply, state}

  def terminate(_, %State{run: run, checks: checks}) when map_size(checks) > 0 do
    do_update(%{status: :failed}, run)
  end
  def terminate(_, _), do: :ok

  defp save_results(%State{run: run, results: results, checks: checks} = state) do
    do_update(%{
      status: status(checks, results),
      results: Enum.map(results, fn {name, status} -> Map.put(status, :name, name) end)
    }, run)
    |> case do
      {:ok, %SentinelRun{status: :success} = run} ->
        {:stop, :normal, %{state | run: run}}
      {:ok, %SentinelRun{status: :pending} = run} ->
        {:noreply, %{state | run: run}}
      {:error, _} -> {:noreply, state}
    end
  end

  defp do_update(attrs, %SentinelRun{} = run) do
    SentinelRun.changeset(run, attrs)
    |> Repo.update()
  end

  defp rule_files(%SentinelRun{sentinel: %Sentinel{repository: %GitRepository{} = repo, git: git}}) do
    with {:ok, f, _} <- Discovery.fetch(repo, git),
         {:ok, contents} <- Tar.tar_stream(f),
      do: {:ok, Map.new(contents)}
  end
  defp rule_files(_), do: {:ok, %{}}

  defp status(checks, _) when map_size(checks) > 0, do: :pending
  defp status(_, results) do
    case Enum.all?(results, fn {_, %{status: status}} -> status == :success end) do
      true -> :success
      false -> :failed
    end
  end

  defp start_check(%Sentinel.SentinelCheck{type: :log} = check, rules), do: Impl.Log.start(check, self(), rules)
  defp start_check(%Sentinel.SentinelCheck{type: :kubernetes} = check, rules), do: Impl.Kubernetes.start(check, self(), rules)
end
