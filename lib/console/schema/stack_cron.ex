defmodule Console.Schema.StackCron do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Stack}

  schema "stack_crons" do
    field :crontab,      :string
    field :auto_approve, :boolean
    field :next_run_at,  :utc_datetime_usec
    field :last_run_at,  :utc_datetime_usec

    embeds_one :overrides, ConfigurationOverrides, on_replace: :update do
      embeds_one :terraform, Stack.Configuration.Terraform, on_replace: :update
    end

    belongs_to :stack, Stack

    timestamps()
  end

  def executable(query \\ __MODULE__) do
    from(c in query, where: c.next_run_at <= ^Timex.now())
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :next_run_at]) do
    from(c in query, order_by: ^order)
  end

  @valid ~w(crontab last_run_at auto_approve stack_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:overrides, with: &overrides_changeset/2)
    |> add_next_run()
    |> validate_required([:crontab, :next_run_at])
  end

  defp overrides_changeset(model, attrs) do
    model
    |> cast(attrs, [])
    |> cast_embed(:terraform, with: &Stack.Configuration.terraform_changeset/2)
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
