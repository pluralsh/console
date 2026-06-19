defmodule Console.Schema.WorkbenchJob do
  use Console.Schema.Base
  alias Console.Schema.{
    PolicyBinding,
    Workbench,
    WorkbenchEval,
    WorkbenchEvalResult,
    WorkbenchJobResult,
    WorkbenchJobActivity,
    User,
    Alert,
    Issue,
    PullRequest,
    ChatbotMessage
  }
  alias Console.Deployments.Policies.Rbac

  defmodule Modes do
    use Console.Schema.Base
    alias Console.Schema.DeploymentSettings.AIProvider

    embedded_schema do
      embeds_one :model, Model, on_replace: :update do
        field :provider, AIProvider
        field :model,    :string
      end

      field :plan, :boolean
      embeds_one :coding, Coding, on_replace: :update do
        field :babysit,  :boolean
        field :approval, :boolean
      end
    end

    def changeset(model, attrs) do
      model
      |> cast(attrs, [:plan])
      |> cast_embed(:model, with: &model_changeset/2)
      |> cast_embed(:coding, with: &coding_changeset/2)
    end

    defp model_changeset(model, attrs) do
      model
      |> cast(attrs, [:provider, :model])
      |> validate_required([:provider, :model])
    end

    defp coding_changeset(model, attrs) do
      model
      |> cast(attrs, ~w(babysit approval)a)
    end
  end

  defenum Status, pending: 0, running: 1, successful: 2, failed: 3, cancelled: 4, paused: 5
  defenum Type, job: 0, skill: 1

  schema "workbench_jobs" do
    field :status, Status, default: :pending
    field :type,   Type, default: :job
    field :prompt, :binary
    field :error,  :binary

    field :started_at,   :utc_datetime_usec
    field :completed_at, :utc_datetime_usec

    embeds_one :modes, Modes, on_replace: :update

    embeds_one :usage, Usage, on_replace: :update do
      field :input_tokens,     :integer
      field :output_tokens,    :integer
      field :total_tokens,     :integer
      field :cached_tokens,    :integer
      field :reasoning_tokens, :integer
      field :input_cost,       :float
      field :output_cost,      :float
      field :total_cost,       :float
    end

    belongs_to :workbench,      Workbench
    belongs_to :user,           User
    belongs_to :alert,          Alert
    belongs_to :issue,          Issue
    belongs_to :referenced_job, __MODULE__

    has_one  :result,          WorkbenchJobResult, on_replace: :update
    has_one  :eval_result,     WorkbenchEvalResult, on_replace: :update
    has_one  :chatbot_message, ChatbotMessage, on_replace: :update
    has_many :activities,      WorkbenchJobActivity, on_replace: :delete
    has_many :pull_requests,   PullRequest, on_replace: :delete

    timestamps()
  end

  def idle?(%__MODULE__{status: s}) when s in ~w(pending failed cancelled successful)a, do: true
  def idle?(%__MODULE__{updated_at: at, inserted_at: iat}) do
    Timex.now()
    |> Timex.shift(minutes: -1)
    |> Timex.after?(at || iat)
  end

  @pollable_statuses ~w(pending paused)a

  def pollable(query \\ __MODULE__) do
    from(j in query,
      where: j.status in @pollable_statuses,
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

  def workbench_usage(query \\ Workbench, period) do
    from(w in query,
      join: r in subquery(avg_workbench_usage(query, period)),
      on: w.id == r.workbench_id,
      select: %{
        workbench: w,
        timestamp: r.timestamp,
        input_tokens: r.input_tokens,
        output_tokens: r.output_tokens,
        total_cost: r.total_cost
      },
      order_by: [asc: r.timestamp]
    )
  end

  defp avg_workbench_usage(query, period) do
    period = normalize_period(period)
    {lookback_value, lookback_unit} = lookback_window(period)

    from(j in __MODULE__,
      join: w in subquery(query),
        on: w.id == j.workbench_id,
      where: j.inserted_at >= ago(^lookback_value, ^lookback_unit),
      group_by: [w.id, 2],
      select: %{
        workbench_id: w.id,
        timestamp: fragment("date_trunc(?, ?) at time zone 'UTC'", ^period, j.inserted_at),
        input_tokens: fragment("sum(coalesce((?->>'input_tokens')::integer, 0))", j.usage),
        output_tokens: fragment("sum(coalesce((?->>'output_tokens')::integer, 0))", j.usage),
        total_cost: fragment("sum(coalesce((?->>'total_cost')::double precision, 0.0))", j.usage)
      },
      order_by: [asc: 2]
    )
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(j in query,
        join: w in assoc(j, :workbench),
        join: p in assoc(w, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == w.read_policy_id or b.policy_id == w.write_policy_id
                or b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
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

  @indexable_statuses ~w(successful failed cancelled)a

  def indexable(query \\ __MODULE__) do
    from(j in query, where: j.status in ^@indexable_statuses and j.type == ^:job)
  end

  def missing_evals(query \\ __MODULE__) do
    from(j in query,
      join: e in WorkbenchEval,
        on: e.workbench_id == j.workbench_id,
      left_join: r in WorkbenchEvalResult,
        on: r.workbench_eval_id == e.id and r.workbench_job_id == j.id,
      where: j.inserted_at >= e.inserted_at and j.type == ^:job and j.status == ^:successful,
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
    |> cast_assoc(:chatbot_message)
    |> cast_embed(:modes)
    |> cast_embed(:usage, with: &usage_changeset/2)
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
    |> cast_assoc(:chatbot_message)
  end

  defp usage_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(
      input_tokens
      output_tokens
      total_tokens
      cached_tokens
      reasoning_tokens
      input_cost
      output_cost
      total_cost
    )a)
  end
end

defmodule Console.Schema.WorkbenchJob.Mini do
  alias Console.Schema.WorkbenchJob

  @type t :: %__MODULE__{
    id: binary,
    status: binary,
    prompt: binary,
    conclusion: binary,
    criticism: binary,
    topology: binary,
    activities: [%{prompt: binary, type: binary, status: binary}],
    pull_requests: [%{title: binary, url: binary, body: binary}]
  }

  @derive Jason.Encoder

  defstruct [:id, :status, :prompt, :conclusion, :criticism, :topology, :activities, :pull_requests]

  def new(%WorkbenchJob{} = job) do
    job = Console.Repo.preload(job, [:result, :activities, :pull_requests])
    %__MODULE__{
      id: job.id,
      status: job.status,
      prompt: job.prompt,
      conclusion: job.result && job.result.conclusion,
      criticism: job.result && job.result.criticism,
      topology: job.result && job.result.topology,
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
      criticism: attrs["criticism"],
      topology: attrs["topology"],
      activities: Enum.map(attrs["activities"], & %{prompt: &1["prompt"], type: &1["type"], status: &1["status"]}),
      pull_requests: Enum.map(attrs["pull_requests"], & %{title: &1["title"], url: &1["url"], body: &1["body"]}),
    }
  end

  def prompt_job(%__MODULE__{} = mini) do
    %{
      prompt: mini.prompt,
      result: %{
        conclusion: mini.conclusion,
        criticism: mini.criticism,
        topology: mini.topology
      },
      activities: mini.activities,
      pull_requests: mini.pull_requests
    }
  end

  @doc """
  Coerces a workbench job status from vector-store decode (string or atom) into the
  schema enum value used by GraphQL.
  """
  @spec normalize_status(term) :: WorkbenchJob.Status.t() | nil
  def normalize_status(status) do
    case WorkbenchJob.Status.cast(status) do
      {:ok, status} -> status
      :error -> nil
    end
  end
end
