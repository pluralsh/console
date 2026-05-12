defmodule Console.Schema.WorkbenchCron do
  use Console.Schema.Base
  alias Console.Schema.{Workbench, User}

  schema "workbench_crons" do
    field :crontab,     :string
    field :prompt,      :binary

    field :next_run_at, :utc_datetime_usec
    field :last_run_at, :utc_datetime_usec

    belongs_to :workbench, Workbench
    belongs_to :user,      User

    timestamps()
  end

  def executable(query \\ __MODULE__) do
    from(c in query, where: c.next_run_at <= ^DateTime.utc_now())
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :next_run_at]) do
    from(c in query, order_by: ^order)
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(c in query, where: c.workbench_id == ^workbench_id)
  end

  def preloaded(query \\ __MODULE__, preloads \\ [:workbench, :user]) do
    from(c in query, preload: ^preloads)
  end

  @valid ~w(crontab prompt last_run_at workbench_id user_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> add_next_run()
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:user_id)
    |> validate_required([:crontab, :next_run_at])
  end

  defp add_next_run(cs) do
    case get_next_run(get_field(cs, :crontab), get_field(cs, :last_run_at)) do
      {:ok, next} -> put_change(cs, :next_run_at, convert_naive(next))
      {:error, err} -> add_error(cs, :crontab, "Failed to generate next run date: #{inspect(err)}")
    end
  end

  defp get_next_run(crontab, last_run) do
    with {:ok, cron} <- Crontab.CronExpression.Parser.parse(crontab),
         do: Crontab.Scheduler.get_next_run_date(cron, Timex.to_naive_datetime(last_run || Timex.now()))
  end

  defp convert_naive(ndt) do
    DateTime.from_naive!(ndt, "Etc/UTC")
    |> Map.put(:microsecond, {0, 6})
  end
end
