defmodule Console.Schema.Devbox do
  use Console.Schema.Base
  alias Console.Schema.{Cluster, DevboxScmConnection, WorkbenchDevbox, DevboxInstance, DevboxSnapshot, PullRequest, PolicyBinding}
  alias Console.Deployments.Pr.Git

  defenum Status, pending: 0, ready: 1, degraded: 2, failed: 3
  defenum AgentType, claude: 0, codex: 1, opencode: 2, gemini: 3, pi: 4
  defenum ProbeStatus, pending: 0, ok: 1, failed: 2, missing: 3
  defenum CloudProvider, aws: 0, gcp: 1, azure: 2
  defenum Autonomy, manual: 0, auto: 1, full: 2
  defenum UpdateMode, on_resume: 0, manual: 1

  @autonomy_rank %{manual: 0, auto: 1, full: 2}

  @default_idle_policy %{
    activity_window: 120,
    grace_period: 300,
    max_deferral: 12 * 60 * 60,
    max_continuous_awake: 24 * 60 * 60,
    complete_after: 14 * 24 * 60 * 60
  }

  defmodule Agent do
    use Console.Schema.Base
    alias Console.Schema.Devbox

    embedded_schema do
      field :type,             Devbox.AgentType
      field :default,          :boolean, default: false
      field :adapter_name,     :string
      field :adapter_version,  :string
      field :adapter_pin,      :string
      field :protocol_version, :integer
      field :acp_v2,           :boolean, default: false
      field :capabilities,     :map
      field :allowed_models,   {:array, :string}
      field :default_model,    :string
      field :current_model,    :string
      field :model_switchable, :boolean, default: true
      field :probe_status,     Devbox.ProbeStatus, default: :pending
      field :probe_error,      :string

      embeds_many :models, Model, on_replace: :delete, primary_key: false do
        field :id,          :string
        field :name,        :string
        field :description, :string
      end

      embeds_many :commands, Console.Schema.DevboxInstanceSession.Command, on_replace: :delete

      embeds_many :config_options, Console.Schema.DevboxInstanceSession.ConfigOption, on_replace: :delete

      embeds_one :session_capabilities, SessionCapabilities, on_replace: :update do
        field :list,   :boolean, default: false
        field :resume, :boolean, default: false
        field :load,   :boolean, default: false
        field :close,  :boolean, default: false
        field :delete, :boolean, default: false
        field :fork,   :boolean, default: false
      end
    end

    @valid ~w(type default adapter_name adapter_version adapter_pin protocol_version acp_v2 capabilities allowed_models
              default_model current_model model_switchable probe_status probe_error)a

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, @valid)
      |> cast_embed(:models, with: &model_changeset/2)
      |> cast_embed(:commands)
      |> cast_embed(:config_options)
      |> cast_embed(:session_capabilities, with: &capabilities_changeset/2)
      |> validate_required([:type])
    end

    defp model_changeset(model, attrs) do
      model
      |> cast(attrs, ~w(id name description)a)
      |> validate_required([:id])
    end

    defp capabilities_changeset(model, attrs) do
      model
      |> cast(attrs, ~w(list resume load close delete fork)a)
    end

    @doc """
    The models offered for this agent: the probed values narrowed by the runner's allowlist, or the allowlist alone
    if the probe returned nothing.
    """
    @spec offered_models(t) :: [binary]
    def offered_models(%__MODULE__{models: [_ | _] = models, allowed_models: [_ | _] = allowed}),
      do: Enum.map(models, & &1.id) |> Enum.filter(&Enum.member?(allowed, &1))
    def offered_models(%__MODULE__{models: [_ | _] = models}), do: Enum.map(models, & &1.id)
    def offered_models(%__MODULE__{allowed_models: [_ | _] = allowed}), do: allowed
    def offered_models(_), do: []

    @doc """
    The model preselected for this agent: the runner's default model, otherwise the agent's own current value.
    """
    @spec default_model(t) :: binary | nil
    def default_model(%__MODULE__{default_model: m}) when is_binary(m), do: m
    def default_model(%__MODULE__{current_model: m}) when is_binary(m), do: m
    def default_model(agent) do
      case offered_models(agent) do
        [m | _] -> m
        _ -> nil
      end
    end

    @doc """
    Whether the agent supports a given thread lifecycle operation over ACP.
    """
    @spec supports?(t, atom) :: boolean
    def supports?(%__MODULE__{session_capabilities: %{} = caps}, op), do: !!Map.get(caps, op)
    def supports?(_, _), do: false
  end

  schema "devboxes" do
    field :name,                 :string
    field :image,                :string
    field :resolved_image,       :string
    field :template_revision,    :string
    field :revision,             :integer
    field :runtime_image,        :string
    field :daemon_version,       :string
    field :update_mode,          UpdateMode, default: :on_resume
    field :status,               Status, default: :pending
    field :resources,            :map
    field :allowed_repositories, {:array, :string}
    field :max_instances,        :integer
    field :browser,              :boolean, default: false
    field :last_heartbeat_at,    :utc_datetime_usec
    field :create_policy_id,     :binary_id

    embeds_many :agents, Agent, on_replace: :delete

    embeds_many :http_allowlist, HttpAllow, on_replace: :delete do
      field :host,        :string
      field :port,        :integer
      field :passthrough, :boolean, default: false
    end

    embeds_many :conditions, Condition, on_replace: :delete do
      field :type,    :string
      field :status,  :string
      field :reason,  :string
      field :message, :string
    end

    embeds_one :idle_policy, IdlePolicy, on_replace: :update do
      field :activity_window,      :integer
      field :cpu_threshold,        :float
      field :grace_period,         :integer
      field :max_deferral,         :integer
      field :max_continuous_awake, :integer
      field :complete_after,       :integer
    end

    embeds_one :autonomy, AutonomyPolicy, on_replace: :update do
      field :default, Console.Schema.Devbox.Autonomy
      field :max,     Console.Schema.Devbox.Autonomy
    end

    embeds_many :cloud_identities, CloudIdentity, on_replace: :delete, primary_key: false do
      field :name,                       :string
      field :provider,                   Console.Schema.Devbox.CloudProvider
      field :default,                    :boolean, default: false
      field :role_arn,                   :string
      field :duration_seconds,           :integer
      field :workload_identity_provider, :string
      field :service_account,            :string
      field :tenant_id,                  :string
      field :client_id,                  :string
      field :authority_host,             :string
    end

    belongs_to :cluster, Cluster

    has_many :scm_connection_associations, DevboxScmConnection, on_replace: :delete
    has_many :scm_connections, through: [:scm_connection_associations, :connection]
    has_many :workbench_devboxes, WorkbenchDevbox
    has_many :workbenches, through: [:workbench_devboxes, :workbench]
    has_many :instances, DevboxInstance
    has_many :snapshots, DevboxSnapshot
    has_many :pull_requests, PullRequest

    has_many :create_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :create_policy_id

    timestamps()
  end

  @doc """
  Whether a repository is allowed on this box, with the same semantics as `AgentRuntime.allowed_repository?/2`
  """
  @spec allowed_repository?(t, binary) :: boolean
  def allowed_repository?(%__MODULE__{allowed_repositories: [_ | _] = allowed}, repo) when is_binary(repo),
    do: Enum.any?(allowed, &(Git.normalize_url(&1) == Git.normalize_url(repo)))
  def allowed_repository?(%__MODULE__{allowed_repositories: [_ | _]}, _), do: false
  def allowed_repository?(_, _), do: true

  @spec agent(t, atom | nil) :: Agent.t | nil
  def agent(%__MODULE__{agents: agents}, nil), do: Enum.find(agents || [], & &1.default)
  def agent(%__MODULE__{agents: agents}, type), do: Enum.find(agents || [], & &1.type == type)

  @doc """
  The effective idle policy for this box, filling in the defaults from the plan for anything unset.
  """
  @spec idle_policy(t) :: map
  def idle_policy(%__MODULE__{idle_policy: %{} = policy}) do
    Map.from_struct(policy)
    |> Enum.reject(fn {_, v} -> is_nil(v) end)
    |> Map.new()
    |> then(&Map.merge(@default_idle_policy, &1))
  end
  def idle_policy(_), do: @default_idle_policy

  @doc """
  The box's autonomy policy: the level new threads start at and the highest a thread may use, both `:auto` when
  the runner sets nothing, with the default lowered to the max.
  """
  @spec autonomy(t) :: %{default: atom, max: atom}
  def autonomy(%__MODULE__{autonomy: %{} = a}) do
    max = a.max || :auto
    default = a.default || :auto
    %{default: (if @autonomy_rank[default] > @autonomy_rank[max], do: max, else: default), max: max}
  end
  def autonomy(_), do: %{default: :auto, max: :auto}

  @doc """
  Whether an autonomy config option value (`"manual"`, `"auto"` or `"full"`) is within the box's cap.
  """
  @spec autonomy_allowed?(t, binary) :: boolean
  def autonomy_allowed?(devbox, value) do
    %{max: max} = autonomy(devbox)
    case Enum.find(Map.keys(@autonomy_rank), &(Atom.to_string(&1) == value)) do
      nil -> false
      level -> @autonomy_rank[level] <= @autonomy_rank[max]
    end
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(d in query, where: d.cluster_id == ^cluster_id)
  end

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(d in query,
      join: wd in assoc(d, :workbench_devboxes),
      where: wd.workbench_id == ^workbench_id
    )
  end

  def search(query \\ __MODULE__, q) do
    from(d in query, where: ilike(d.name, ^"%#{q}%"))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(d in query, order_by: ^order)
  end
  @valid ~w(name image resolved_image template_revision revision runtime_image daemon_version update_mode status resources
            allowed_repositories max_instances browser last_heartbeat_at)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:agents)
    |> cast_embed(:http_allowlist, with: &http_changeset/2)
    |> cast_embed(:conditions, with: &condition_changeset/2)
    |> cast_embed(:idle_policy, with: &idle_changeset/2)
    |> cast_embed(:autonomy, with: &autonomy_changeset/2)
    |> cast_embed(:cloud_identities, with: &cloud_identity_changeset/2)
    |> cast_assoc(:scm_connection_associations)
    |> unique_constraint(:name, name: :devboxes_cluster_id_name_uniq_index, message: "a devbox with this name already exists for this cluster")
    |> foreign_key_constraint(:id, name: :devbox_snapshots_devbox_id_fkey, match: :exact, message: "cannot delete a devbox while snapshots of it exist")
    |> validate_number(:max_instances, greater_than: 0)
    |> validate_length(:name, max: 255)
    |> validate_required([:name, :cluster_id])
    |> validate_agents()
    |> put_new_change(:create_policy_id, &Ecto.UUID.generate/0)
    |> cast_assoc(:create_bindings)
  end

  def heartbeat_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(status resolved_image template_revision revision runtime_image daemon_version last_heartbeat_at)a)
    |> cast_embed(:conditions, with: &condition_changeset/2)
  end

  defp validate_agents(cs) do
    case get_field(cs, :agents) do
      [_ | _] = agents -> validate_default_agent(cs, Enum.count(agents, & &1.default), agents)
      _ -> cs
    end
  end

  defp validate_default_agent(cs, 1, agents) do
    case Enum.uniq_by(agents, & &1.type) do
      ^agents -> cs
      _ -> add_error(cs, :agents, "each agent type can only be declared once")
    end
  end
  defp validate_default_agent(cs, _, _), do: add_error(cs, :agents, "exactly one agent must be marked as the default")

  defp http_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(host port passthrough)a)
    |> validate_required([:host])
  end

  defp condition_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(type status reason message)a)
    |> validate_required([:type, :status])
  end

  @identity ~w(name provider default role_arn duration_seconds workload_identity_provider service_account tenant_id client_id authority_host)a

  defp cloud_identity_changeset(model, attrs) do
    model
    |> cast(attrs, @identity)
    |> validate_required([:name, :provider])
    |> validate_format(:name, ~r/^[a-z0-9][a-z0-9-]*$/)
    |> validate_identity()
  end

  defp validate_identity(cs) do
    case get_field(cs, :provider) do
      :aws -> validate_required(cs, [:role_arn])
      :gcp -> validate_format(validate_required(cs, [:workload_identity_provider]), :workload_identity_provider, ~r{^(//iam\.googleapis\.com/)?projects/[0-9]+/locations/global/workloadIdentityPools/[a-z0-9-]+/providers/[a-z0-9-]+$})
      :azure -> validate_required(cs, [:tenant_id, :client_id])
      _ -> cs
    end
  end

  defp idle_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(activity_window cpu_threshold grace_period max_deferral max_continuous_awake complete_after)a)
  end

  defp autonomy_changeset(model, attrs), do: cast(model, attrs, ~w(default max)a)
end
