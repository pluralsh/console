defmodule Console.Schema.WorkbenchJob do
  use Console.Schema.Base
  alias Console.Schema.{
    Workbench,
    WorkbenchEval,
    WorkbenchEvalResult,
    WorkbenchJobResult,
    WorkbenchJobActivity,
    User,
    Alert,
    Issue,
    PullRequest
  }

  defenum Status, pending: 0, running: 1, successful: 2, failed: 3, cancelled: 4
  defenum Type, job: 0, skill: 1

  schema "workbench_jobs" do
    field :status, Status, default: :pending
    field :type,   Type, default: :job
    field :prompt, :binary
    field :error,  :binary

    field :started_at,   :utc_datetime_usec
    field :completed_at, :utc_datetime_usec

    belongs_to :workbench,      Workbench
    belongs_to :user,           User
    belongs_to :alert,          Alert
    belongs_to :issue,          Issue
    belongs_to :referenced_job, __MODULE__

    has_one  :result,        WorkbenchJobResult, on_replace: :update
    has_one  :eval_result,   WorkbenchEvalResult, on_replace: :update
    has_many :activities,    WorkbenchJobActivity, on_replace: :delete
    has_many :pull_requests, PullRequest, on_replace: :delete

    timestamps()
  end

  def idle?(%__MODULE__{status: s}) when s in ~w(pending failed cancelled successful)a, do: true
  def idle?(%__MODULE__{updated_at: at, inserted_at: iat}) do
    Timex.now()
    |> Timex.shift(minutes: -1)
    |> Timex.after?(at || iat)
  end

  def pollable(query \\ __MODULE__) do
    from(j in query,
      where: j.status == ^:pending,
      order_by: [asc: :inserted_at]
    )
  end

  def with_alert(query \\ __MODULE__) do
    from(j in query, where: not is_nil(j.alert_id))
  end

  def with_issue(query \\ __MODULE__) do
    from(j in query, where: not is_nil(j.issue_id))
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(j in query, where: j.workbench_id == ^workbench_id)
  end

  def for_status(query \\ __MODULE__, status) do
    from(j in query, where: j.status == ^status)
  end

  def for_flow(query \\ __MODULE__, flow_id) do
    from(j in query,
      join: w in assoc(j, :workbench),
      join: fb in assoc(w, :flows_workbenches),
      where: fb.flow_id == ^flow_id
    )
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(j in query, order_by: ^order)
  end

  def expired(query \\ __MODULE__) do
    from(j in query, where: j.inserted_at < ago(14, "day"))
  end

  def preloaded(query \\ __MODULE__, preloads \\ [:result]) do
    from(j in query, preload: ^preloads)
  end

  def requires_backfill(query \\ __MODULE__) do
    from(j in query, where: is_nil(j.knowledge_updated_at) and j.type == ^:job)
  end

  def resolved(query \\ __MODULE__) do
    from(j in query,
      left_join: pr in ^PullRequest.for_status(:merged),
        on: pr.workbench_job_id == j.id,
      where: not is_nil(pr.id) and j.type == ^:job,
      select: j,
      distinct: true
    )
  end

  def missing_evals(query \\ __MODULE__) do
    from(j in query,
      join: e in WorkbenchEval,
        on: e.workbench_id == j.workbench_id,
      left_join: r in WorkbenchEvalResult,
        on: r.workbench_eval_id == e.id and r.workbench_job_id == j.id,
      where: j.inserted_at >= e.inserted_at and j.type == ^:job,
      where: is_nil(r.id),
      select: j,
      distinct: true
    )
  end

  @valid ~w(status type prompt workbench_id error user_id started_at completed_at alert_id issue_id referenced_job_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:result)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:alert_id)
    |> foreign_key_constraint(:issue_id)
    |> foreign_key_constraint(:referenced_job_id)
    |> validate_required([:status, :workbench_id, :user_id])
  end

  def update_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:result)
  end
end

defmodule Console.Schema.WorkbenchJob.Mini do
  alias Console.Schema.WorkbenchJob

  @type t :: %__MODULE__{
    id: binary,
    status: binary,
    prompt: binary,
    conclusion: binary,
    topology: binary,
    activities: [%{prompt: binary, type: binary, status: binary}],
    pull_requests: [%{title: binary, url: binary, body: binary}]
  }

  @derive Jason.Encoder

  defstruct [:id, :status, :prompt, :conclusion, :topology, :activities, :pull_requests]

  def new(%WorkbenchJob{} = job) do
    job = Console.Repo.preload(job, [:result, :activities, :pull_requests])
    %__MODULE__{
      id: job.id,
      status: job.status,
      prompt: job.prompt,
      conclusion: job.result.conclusion,
      topology: job.result.topology,
      activities: Enum.map(job.activities, & %{prompt: &1.prompt, type: &1.type, status: &1.status}),
      pull_requests: Enum.map(job.pull_requests, & %{title: &1.title, url: &1.url, body: &1.body}),
    }
  end

  def new(%{} = attrs) do
    %__MODULE__{
      id: attrs["id"],
      status: attrs["status"],
      prompt: attrs["prompt"],
      conclusion: attrs["conclusion"],
      topology: attrs["topology"],
      activities: Enum.map(attrs["activities"], & %{prompt: &1["prompt"], type: &1["type"], status: &1["status"]}),
      pull_requests: Enum.map(attrs["pull_requests"], & %{title: &1["title"], url: &1["url"], body: &1["body"]}),
    }
  end
end
