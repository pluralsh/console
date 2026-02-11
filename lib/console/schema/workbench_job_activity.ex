defmodule Console.Schema.WorkbenchJobActivity do
  use Console.Schema.Base
  alias Console.Schema.{WorkbenchJob, AgentRun}

  defenum Status, pending: 0, running: 1, successful: 2, failed: 3, cancelled: 4
  defenum Type, coding: 0, observability: 1, integrations: 2, ticketing: 3, infrastructure: 4, memo: 5, plan: 6

  schema "workbench_job_activities" do
    field :status, Status, default: :pending
    field :type,   Type
    field :prompt, :binary

    embeds_one :tool_call, ToolCall, on_replace: :update do
      field :call_id,   :string
      field :name,      :string
      field :arguments, :map
    end

    embeds_one :result, WorkbenchJobResult, on_replace: :update do
      field :output,          :string

      embeds_one :job_update, JobUpdate, on_replace: :update do
        field :diff,            :string
        field :working_theory,  :string
        field :conclusion,      :string
      end

      embeds_many :metrics, Metric, on_replace: :delete do
        field :timestamp, :utc_datetime_usec
        field :name,      :string
        field :value,     :float
        field :labels,    :map
      end

      embeds_many :logs, Log, on_replace: :delete do
        field :timestamp, :utc_datetime_usec
        field :message,   :string
        field :labels,    :map
      end
    end

    belongs_to :workbench_job, WorkbenchJob
    belongs_to :agent_run, AgentRun

    timestamps()
  end

  def for_workbench_job(query \\ __MODULE__, job_id) do
    from(a in query, where: a.workbench_job_id == ^job_id)
  end

  def for_agent_run(query \\ __MODULE__, agent_run_id) do
    from(a in query, where: a.agent_run_id == ^agent_run_id)
  end

  def for_status(query \\ __MODULE__, status) do
    from(a in query, where: a.status == ^status)
  end

  def for_type(query \\ __MODULE__, type) do
    from(a in query, where: a.type == ^type)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(a in query, order_by: ^order)
  end

  @valid ~w(status type prompt workbench_job_id agent_run_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:result, with: &result_changeset/2)
    |> cast_embed(:tool_call, with: &tool_call_changeset/2)
    |> foreign_key_constraint(:workbench_job_id)
    |> foreign_key_constraint(:agent_run_id)
    |> validate_required([:status, :type, :prompt, :workbench_job_id])
  end

  defp tool_call_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(call_id name arguments)a)
  end

  defp result_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(output)a)
    |> cast_embed(:job_update, with: &job_update_changeset/2)
    |> cast_embed(:metrics, with: &metric_changeset/2)
    |> cast_embed(:logs, with: &log_changeset/2)
  end

  defp job_update_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(diff working_theory conclusion)a)
  end

  defp metric_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(timestamp name value labels)a)
  end

  defp log_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(timestamp message labels)a)
  end
end
