defmodule Console.Cron.Job do
  alias Crontab.{Scheduler, CronExpression.Parser}

  defstruct [:crontab, :next_run_at, :job]

  def new(crontab, job) do
    crontab = convert(crontab)
    crontab = Parser.parse!(crontab)
    %__MODULE__{crontab: crontab, job: job, next_run_at: Scheduler.get_next_run_date!(crontab)}
  end

  def due?(%__MODULE__{next_run_at: at}), do: Timex.before?(at, Timex.now())

  def exec(%__MODULE__{crontab: tab, job: {m, f, a}} = job) do
    Task.async(fn ->
      apply(m, f, a)
    end)
    %{job | next_run_at: Scheduler.get_next_run_date!(tab, next_date())}
  end

  defp next_date() do
    Timex.now()
    |> Timex.shift(minutes: 1)
    |> Timex.to_naive_datetime()
  end

  defp convert("@daily"), do: "0 0 * * *"
  defp convert(crontab), do: crontab
end
