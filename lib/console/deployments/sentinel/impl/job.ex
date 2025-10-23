defmodule Console.Deployments.Sentinel.Impl.Job do
  @moduledoc """
  A runner for integration test sentinel checks.  This basically operates via two steps:

  1. Creates all the jobs for a run en-mass on init
  2. Polls for the status of the jobs every 30 seconds and either updates the runner or stops if all finished
  """
  use GenServer
  import Console.Deployments.Sentinel.Impl.Base
  alias Console.Deployments.Sentinels
  alias Console.Repo
  alias Console.Schema.{SentinelRun, SentinelRunJob, Sentinel.SentinelCheck}

  require Logger

  @poll :timer.seconds(30)

  def start(%SentinelRun{} = run, %SentinelCheck{} = check, pid) when is_pid(pid) do
    GenServer.start(__MODULE__, {run, check, pid})
  end

  def init({%SentinelRun{} = run, %SentinelCheck{} = check, pid}) do
    :timer.send_interval(@poll, :poll)
    {:ok, {run, check, pid}, {:continue, :setup}}
  end

  def handle_continue(:setup, {run, check, pid}) do
    {:ok, count} = Sentinels.spawn_jobs(run, check.name)
    Logger.info "Spawned #{count} sentinel jobs for #{check.name}"
    {:noreply, {run, check, pid}}
  end

  def handle_info(:poll, {run, check, pid}) do
    statistics = compile_statistics(run, check)
    case status(statistics) do
      :pending ->
        post_update(pid, Map.put(counts(statistics), :status, :pending))
        {:noreply, {run, check, pid}}
      status ->
        post_status(pid, Map.put(counts(statistics), :status, status))
        {:stop, :normal, {run, check, pid}}
    end
  end

  defp compile_statistics(%SentinelRun{id: id}, %SentinelCheck{name: name}) do
    SentinelRunJob.for_sentinel_run(id)
    |> SentinelRunJob.for_check(name)
    |> SentinelRunJob.statistics()
    |> Repo.all()
    |> Map.new(& {&1.status, &1.count || 0})
    |> then(&Map.merge(%{pending: 0, running: 0, failed: 0, success: 0}, &1))
  end

  defp status(%{pending: 0, running: 0, failed: f}) when f > 0, do: :failed
  defp status(%{pending: 0, running: 0, failed: f}) when f <= 0, do: :success
  defp status(_), do: :pending

  def counts(statistics) do
    %{
      job_count: Enum.sum(Map.values(statistics)),
      successful_count: Map.get(statistics, :success, 0),
      failed_count: Map.get(statistics, :failed, 0),
    }
  end
end
