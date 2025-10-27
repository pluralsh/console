defmodule Console.Cron.Scheduler do
  use GenServer
  alias Console.Cron.Job
  require Logger

  @poll :timer.minutes(1)

  def start_link(_ \\ :ok) do
    GenServer.start_link(__MODULE__, :ok)
  end

  def init(_) do
    :timer.send_interval(@poll, :tick)
    jobs = Enum.map(Console.conf(__MODULE__)[:jobs], fn {tab, job} -> Job.new(tab, job) end)
    Logger.info "managing cron jobs: #{inspect(jobs)}"
    {:ok, jobs}
  end

  def handle_info(:tick, jobs) do
    Logger.info "checking for crons to run..."
    {jobs, ignore} = Enum.split_with(jobs, & local?(&1) && Job.due?(&1))
    Logger.info "executing #{length(jobs)} crons"
    jobs = Enum.map(jobs, &Job.exec/1)
    {:noreply, jobs ++ ignore}
  end

  def handle_info(_, jobs), do: {:noreply, jobs}

  defp local?(%Job{} = job), do: job_node(job) == node()

  defp job_node(%Job{job: job}), do: Console.ClusterRing.node(job)
end
