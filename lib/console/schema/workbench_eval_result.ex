defmodule Console.Schema.WorkbenchEvalResult do
  use Console.Schema.Base
  alias Console.Schema.{WorkbenchEval, WorkbenchJob, Workbench}

  schema "workbench_eval_results" do
    field :grade,    :integer

    embeds_one :feedback, Feedback, on_replace: :update do
      field :summary, :string
      field :prompt,  :string
      field :result,  :string
      field :logic,   :string
    end

    belongs_to :workbench_eval, WorkbenchEval
    belongs_to :workbench_job,  WorkbenchJob

    timestamps()
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(r in query,
      join: e in assoc(r, :workbench_eval),
      where: e.workbench_id == ^workbench_id
    )
  end

  def for_eval(query \\ __MODULE__, eval_id) do
    from(r in query, where: r.workbench_eval_id == ^eval_id)
  end

  def for_job(query \\ __MODULE__, job_id) do
    from(r in query, where: r.workbench_job_id == ^job_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(r in query, order_by: ^order)
  end

  def workbench_grades(query \\ Workbench, period) do
    from(w in query,
      join: r in subquery(avg_workbench_grades(query, period)),
      on: w.id == r.workbench_id,
      select: %{
        workbench: w,
        timestamp: r.timestamp,
        average: r.average
      },
      order_by: [desc: r.timestamp]
    )
  end

  defp avg_workbench_grades(query, period) do
    period = normalize_period(period)
    {lookback_value, lookback_unit} = lookback_window(period)

    from(r in __MODULE__,
      join: e in assoc(r, :workbench_eval),
      join: w in subquery(query),
        on: w.id == e.workbench_id,
      where: r.inserted_at >= ago(^lookback_value, ^lookback_unit),
      group_by: [w.id, 2],
      select: %{
        workbench_id: w.id,
        timestamp: fragment("date_trunc(?, ?) at time zone 'UTC'", ^period, e.inserted_at),
        average: fragment("?::float", avg(r.grade))
      },
      order_by: [desc: 2]
    )
  end

  def average_grades(query \\ __MODULE__, period) do
    period = normalize_period(period)
    {lookback_value, lookback_unit} = lookback_window(period)

    from(r in query,
      where: not is_nil(r.grade),
      where: r.inserted_at >= ago(^lookback_value, ^lookback_unit),
      group_by: 1,
      select: %{
        timestamp: fragment("date_trunc(?, ?) at time zone 'UTC'", ^period, r.inserted_at),
        average: fragment("?::float", avg(r.grade))
      },
      order_by: [desc: 1]
    )
  end

  @valid ~w(grade workbench_eval_id workbench_job_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:feedback, with: &feedback_changeset/2)
    |> foreign_key_constraint(:workbench_eval_id)
    |> foreign_key_constraint(:workbench_job_id)
    |> validate_inclusion(:grade, 0..10, message: "grade must be between 0 and 10")
    |> unique_constraint([:workbench_eval_id, :workbench_job_id])
    |> validate_required([:workbench_eval_id, :workbench_job_id, :grade])
  end

  def feedback_changeset(model, attrs) do
    model
    |> cast(attrs, [:summary, :prompt, :result, :logic])
    |> validate_required([:summary])
  end
end
