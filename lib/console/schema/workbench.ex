defmodule Console.Schema.Workbench do
  use Console.Schema.Base
  use Waffle.Ecto.Schema
  alias Console.Schema.{
    Project,
    Service,
    GitRepository,
    AgentRuntime,
    WorkbenchJob,
    WorkbenchToolAssociation,
    WorkbenchWebhook,
    WorkbenchChatbot,
    WorkbenchCron,
    WorkbenchPrompt,
    WorkbenchSkill,
    WorkbenchEval,
    PolicyBinding,
    WorkbenchPolicy,
    FlowWorkbench,
    User,
    AgentRun,
    Alert
  }
  alias Console.Deployments.Policies.Rbac
  alias Console.Uploads.Type

  defenum BudgetUnit, dollar: 0, token: 1

  defmodule Budget do
    @moduledoc """
    Token bucket based budget tracking for workbenches.  Should always be updated atomically via the Workbenches service module.
    """
    use Console.Schema.Base

    @minutes_per_month 30 * 24 * 60
    @minutes_per_hour 60

    embedded_schema do
      field :enabled,      :boolean
      field :maximum,      :float
      field :min_free,     :float
      field :unit,         Console.Schema.Workbench.BudgetUnit
      field :last,         :float
      field :last_updated, :utc_datetime_usec
    end

    @valid ~w(enabled maximum unit last last_updated min_free)a

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, @valid)
      |> validate_required([:maximum, :unit])
      |> put_new_change(:min_free, fn -> min_free(attrs) end)
    end

    @doc """
    Returns the amount currently in the bucket, including elapsed refill time.
    """
    def total_available(%__MODULE__{maximum: maximum} = budget, now \\ DateTime.utc_now())
        when is_number(maximum) do
      available =
        (budget.last || maximum) +
          refill_rate(maximum) * elapsed_minutes(budget.last_updated, now)

      min(available, maximum)
    end

    @doc """
    Consumes an amount from the bucket after lazily applying its refill.
    """
    def consume(budget, quantity, now \\ DateTime.utc_now())
    def consume(%__MODULE__{enabled: true} = budget, quantity, now)
        when is_number(quantity) and quantity >= 0 do
      %{budget | last: total_available(budget, now) - quantity, last_updated: now}
    end
    def consume(%__MODULE__{} = budget, _quantity, _now), do: budget

    @doc """
    Returns whether the budget can accept new work.
    """
    def available?(budget, now \\ DateTime.utc_now())
    def available?(%__MODULE__{enabled: true} = budget, now) do
      total_available(budget, now) > (budget.min_free || 0)
    end
    def available?(%__MODULE__{}, _now), do: true

    defp min_free(attrs) do
      with {:free, nil} <- {:free, Map.get(attrs, :min_free)},
           max when is_number(max) <- Map.get(attrs, :maximum) do
        max * @minutes_per_hour / @minutes_per_month
      else
        {:free, free} when is_number(free) -> free
        _ -> nil
      end
    end

    defp refill_rate(maximum), do: maximum / @minutes_per_month
    defp elapsed_minutes(nil, _now), do: 0
    defp elapsed_minutes(last_updated, now), do: max(DateTime.diff(now, last_updated, :second) / 60, 0)
  end

  schema "workbenches" do
    field :name,           :string
    field :description,    :string
    field :system_prompt,  :binary
    field :memory,         Type

    embeds_one :configuration, Configuration, on_replace: :update do
      embeds_one :infrastructure, Infrastructure, on_replace: :update do
        field :services,        :boolean
        field :stacks,          :boolean
        field :kubernetes,      :boolean
        field :pod_logs,        :boolean
        field :vulnerabilities, :boolean
        field :sentinels,       :boolean
      end

      embeds_one :observability, Observability, on_replace: :update do
        field :logs,    :boolean
        field :metrics, :boolean
      end

      embeds_one :coding, Coding, on_replace: :update do
        field :mode,               AgentRun.Mode
        field :enable_babysitting, :boolean
        field :repositories,       {:array, :string}
      end
    end

    embeds_one :modes, WorkbenchJob.Modes, on_replace: :update
    embeds_one :budget, Budget, on_replace: :update

    embeds_one :skills, Skills, on_replace: :update do
      embeds_one :ref, Service.Git, on_replace: :update
      field :files, {:array, :string}
    end

    field :read_policy_id,  :binary_id
    field :write_policy_id, :binary_id

    has_many :read_bindings, PolicyBinding,
      on_replace:  :delete,
      foreign_key: :policy_id,
      references:  :read_policy_id
    has_many :write_bindings, PolicyBinding,
      on_replace:  :delete,
      foreign_key: :policy_id,
      references:  :write_policy_id

    belongs_to :project,   Project
    belongs_to :repository, GitRepository
    belongs_to :agent_runtime, AgentRuntime
    belongs_to :bot_user, User, foreign_key: :bot_user_id

    has_many :tool_associations, WorkbenchToolAssociation, on_replace: :delete
    has_many :jobs,              WorkbenchJob,     on_replace: :delete
    has_many :webhooks,          WorkbenchWebhook,  on_replace: :delete
    has_many :workbench_chatbots, WorkbenchChatbot, on_replace: :delete
    has_many :crons,             WorkbenchCron,     on_replace: :delete
    has_many :prompts,           WorkbenchPrompt,  on_replace: :delete
    has_many :flows_workbenches, FlowWorkbench,    on_replace: :delete
    has_many :workbench_skills,  WorkbenchSkill,   on_replace: :delete
    has_many :workbench_policies, WorkbenchPolicy, on_replace: :delete
    has_many :alerts,            Alert
    has_one :eval,               WorkbenchEval

    has_many :tools, through: [:tool_associations, :tool]
    has_many :policies, through: [:workbench_policies, :policy]
    timestamps()
  end

  def for_project(query \\ __MODULE__, project_id) do
    from(w in query, where: w.project_id == ^project_id)
  end

  def for_repository(query \\ __MODULE__, repository_id) do
    from(w in query, where: w.repository_id == ^repository_id)
  end

  def for_agent_runtime(query \\ __MODULE__, runtime_id) do
    from(w in query, where: w.agent_runtime_id == ^runtime_id)
  end

  def search(query \\ __MODULE__, q) do
    from(w in query, where: ilike(w.name, ^"%#{q}%"))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(w in query, order_by: ^order)
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(w in query,
        join: p in assoc(w, :project),
        left_join: b in PolicyBinding,
          on: b.policy_id == w.read_policy_id or b.policy_id == w.write_policy_id
                or b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  @valid ~w(name description system_prompt project_id repository_id agent_runtime_id bot_user_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_attachments(attrs, [:memory])
    |> cast_assoc(:workbench_skills)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> cast_assoc(:tool_associations)
    |> cast_embed(:modes)
    |> cast_embed(:skills, with: &skills_changeset/2)
    |> cast_embed(:configuration, with: &configuration_changeset/2)
    |> cast_embed(:budget)
    |> unique_constraint(:name)
    |> foreign_key_constraint(:project_id)
    |> foreign_key_constraint(:repository_id)
    |> foreign_key_constraint(:agent_runtime_id)
    |> foreign_key_constraint(:bot_user_id)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> validate_required([:name])
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end

  def skills_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(files)a)
    |> cast_embed(:ref)
    |> validate_required([:ref, :files])
  end

  def configuration_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_embed(:infrastructure, with: &infrastructure_changeset/2)
    |> cast_embed(:coding, with: &coding_changeset/2)
    |> cast_embed(:observability, with: &observability_changeset/2)
  end

  def infrastructure_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(services stacks kubernetes pod_logs vulnerabilities sentinels)a)
  end

  def coding_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(mode repositories enable_babysitting)a)
  end

  def observability_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(logs metrics)a)
  end
end
