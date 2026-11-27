defmodule Console.Schema.DevboxInstance do
  use Console.Schema.Base
  alias Console.Schema.{
    Workbench,
    Devbox,
    DevboxSnapshot,
    DevboxInstanceSession,
    DevboxInstanceInteraction,
    DevboxUpdateCampaign,
    PullRequest,
    User
  }

  defenum Status,
    pending: 0,
    provisioning: 1,
    running: 2,
    suspended: 3,
    snapshotting: 4,
    completed: 5,
    failed: 6,
    cancelled: 7

  defenum ForegroundState, idle: 0, running: 1, requires_action: 2
  defenum Fidelity, memory: 0, filesystem: 1
  defenum RebaseState, in_progress: 0, succeeded: 1, failed: 2

  @terminal ~w(completed failed cancelled)a

  @transitions %{
    pending:      ~w(provisioning running failed cancelled)a,
    provisioning: ~w(running failed cancelled)a,
    running:      ~w(suspended snapshotting provisioning completed failed cancelled)a,
    suspended:    ~w(running provisioning completed failed cancelled)a,
    snapshotting: ~w(running suspended failed cancelled)a,
    completed:    [],
    failed:       [],
    cancelled:    []
  }

  defguard is_terminal(status) when status in @terminal

  defmodule Delta do
    @moduledoc """
    A live ACP entity change for an instance, published on `devbox_instances:<id>:deltas` and never stored.  Follows
    the `AgentMessage.Stdout` pattern.
    """
    @type t :: %__MODULE__{
      instance_id: binary,
      session_id: binary | nil,
      thread_id: binary | nil,
      entity_type: binary | nil,
      entity_id: binary | nil,
      position: integer | nil,
      op: atom,
      state_kind: binary | nil,
      payload: map | nil,
      entity: map | nil,
      offset: integer | nil,
      seq: integer | nil,
      stream: binary | nil,
      emitted_at: DateTime.t | nil,
      cluster: Console.Schema.Cluster.t | nil
    }
    defstruct [
      :instance_id,
      :session_id,
      :thread_id,
      :entity_type,
      :entity_id,
      :position,
      :op,
      :state_kind,
      :payload,
      :entity,
      :offset,
      :seq,
      :stream,
      :emitted_at,
      :cluster
    ]

    @ops ~w(append patch notice state settle pull_request)a

    @spec new(map, Console.Schema.Cluster.t | nil) :: t
    def new(attrs, cluster) do
      struct(__MODULE__, Map.put(attrs, :cluster, cluster))
      |> Map.update!(:op, &op/1)
    end

    defp op(op) when op in @ops, do: op
    defp op(op) when is_binary(op), do: Enum.find(@ops, :patch, &Atom.to_string(&1) == String.downcase(op))
    defp op(_), do: :patch
  end

  defmodule IndexDelta do
    @moduledoc """
    The index rows an `UpsertInstanceIndex` call changed, published on `devbox_instances:<id>:index`.  `revision`
    and `foreground_state` are set when the call changed the instance aggregate.
    """
    @type t :: %__MODULE__{
      instance_id: binary,
      revision: integer,
      foreground_state: atom,
      sessions: [Console.Schema.DevboxInstanceSession.t],
      interactions: [Console.Schema.DevboxInstanceInteraction.t]
    }
    defstruct [:instance_id, :revision, :foreground_state, sessions: [], interactions: []]
  end

  schema "devbox_instances" do
    field :name,                   :string
    field :agent,                  Devbox.AgentType
    field :requested_model,        :string
    field :repositories,           {:array, :string}
    field :config_options,         :map
    field :agent_billing,          :map
    field :max_running_threads,    :integer, default: 4
    field :status,                 Status, default: :pending
    field :status_reason,          :string
    field :actor_ref,              :string
    field :template_revision,      :string
    field :image_digest,           :string
    field :daemon_version,         :string
    field :rebase_state,           RebaseState
    field :rebase_error,           :string
    field :rebase_revision,        :string
    field :rebase_attempts,        :integer, default: 0
    field :rebase_requested_at,    :utc_datetime_usec
    field :last_rebased_at,        :utc_datetime_usec
    field :update_deadline_at,     :utc_datetime_usec
    field :restore_fidelity,       Fidelity
    field :foreground_state,       ForegroundState, default: :idle
    field :viewers,                :map
    field :viewer_lease_until,     :utc_datetime_usec
    field :keep_awake_until,       :utc_datetime_usec
    field :awake_since,            :utc_datetime_usec
    field :index_revision,         :integer, default: 0
    field :status_generation,      :integer, default: 0
    field :lease_generation,       :integer, default: 0
    field :running_threads,        :integer, default: 0
    field :waiting_threads,        :integer, default: 0
    field :started_at,             :utc_datetime_usec
    field :suspended_at,           :utc_datetime_usec
    field :completed_at,           :utc_datetime_usec
    field :last_activity_at,       :utc_datetime_usec
    field :credentials_revoked_at, :utc_datetime_usec

    embeds_many :agent_connections, AgentConnection, on_replace: :delete do
      field :agent,            Devbox.AgentType
      field :protocol_version, :integer
      field :adapter_name,     :string
      field :adapter_version,  :string
      field :capabilities,     :map
      field :billing,          :string
    end

    embeds_many :checkouts, Checkout, on_replace: :delete, primary_key: false do
      field :path,               :string
      field :name,               :string
      field :remote_url,         :string
      field :default_branch,     :string
      field :branch,             :string
      field :head_sha,           :string
      field :dirty,              :boolean
      field :worktree_thread_id, :string
      field :ahead,              :integer
      field :behind,             :integer
    end

    embeds_one :idle_state, IdleState, on_replace: :update do
      field :idle,         :boolean
      field :idle_since,   :utc_datetime_usec
      field :busy_reasons, {:array, :map}
      field :suspends_at,  :utc_datetime_usec
      field :message,      :string
    end

    belongs_to :workbench,     Workbench
    belongs_to :devbox,        Devbox
    belongs_to :snapshot,      DevboxSnapshot
    belongs_to :user,          User
    belongs_to :keep_awake_by, User
    belongs_to :update_campaign, DevboxUpdateCampaign

    has_many :sessions,      DevboxInstanceSession, foreign_key: :instance_id
    has_many :threads,       DevboxInstanceSession, foreign_key: :instance_id, where: [kind: :thread]
    has_many :interactions,  DevboxInstanceInteraction, foreign_key: :instance_id
    has_many :pull_requests, PullRequest

    timestamps()
  end

  @spec terminal?(t | atom) :: boolean
  def terminal?(%__MODULE__{status: status}), do: terminal?(status)
  def terminal?(status), do: status in @terminal

  @spec can_transition?(atom, atom) :: boolean
  def can_transition?(same, same), do: true
  def can_transition?(from, to), do: Enum.member?(Map.get(@transitions, from, []), to)

  def for_workbench(query \\ __MODULE__, workbench_id) do
    from(i in query, where: i.workbench_id == ^workbench_id)
  end

  def for_devbox(query \\ __MODULE__, devbox_id) do
    from(i in query, where: i.devbox_id == ^devbox_id)
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(i in query,
      join: d in assoc(i, :devbox),
      where: d.cluster_id == ^cluster_id
    )
  end

  def for_status(query \\ __MODULE__, status) do
    from(i in query, where: i.status == ^status)
  end

  def for_campaign(query \\ __MODULE__, campaign_id) do
    from(i in query, where: i.update_campaign_id == ^campaign_id)
  end

  @doc "the instance while it still holds the update claimed at `requested_at`, which no outcome has settled yet"
  def claimed(query \\ __MODULE__, id, requested_at) do
    from(i in query, where: i.id == ^id and i.rebase_state == ^:in_progress and i.rebase_requested_at == ^requested_at)
  end

  @doc """
  Instances on another template revision than the one their box serves.  The gateway reports an instance's revision
  by number, which is what `Devbox.revision` is (`Devbox.template_revision` is the template's name).  An instance
  moves to the serving revision or stays where it is, so a different one is an older one.  Nothing is outdated
  until both sides have reported a number: an instance holds its box's template name from when it is created
  until the gateway first reports, and a box whose operator predates this doesn't send one.
  """
  def outdated(query \\ __MODULE__) do
    from(i in query,
      join: d in assoc(i, :devbox),
      as: :outdated_devbox,
      where: not is_nil(d.revision) and fragment("? ~ '^[0-9]+$'", i.template_revision)
        and i.template_revision != fragment("?::text", d.revision)
    )
  end

  @doc "Whether the instance is behind the template revision its (preloaded) box serves"
  @spec outdated?(t) :: boolean
  def outdated?(%__MODULE__{status: status}) when status in @terminal, do: false
  def outdated?(%__MODULE__{template_revision: rev, devbox: %Devbox{revision: current}})
    when is_binary(rev) and is_integer(current) do
    case Integer.parse(rev) do
      {number, ""} -> number != current
      _ -> false
    end
  end
  def outdated?(_), do: false

  def for_statuses(query \\ __MODULE__, statuses) do
    from(i in query, where: i.status in ^statuses)
  end

  def live(query \\ __MODULE__) do
    from(i in query, where: i.status not in ^@terminal)
  end

  def names(query \\ __MODULE__) do
    from(i in query, select: i.name)
  end

  def pending_before(query \\ __MODULE__, ts) do
    from(i in query, where: i.status == ^:pending and i.inserted_at < ^ts)
  end

  def suspended_before(query \\ __MODULE__, ts) do
    from(i in query, where: i.status == ^:suspended and i.suspended_at < ^ts)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(i in query, order_by: ^order)
  end

  def cluster_id(query \\ __MODULE__, id) do
    from(i in query,
      join: d in assoc(i, :devbox),
      where: i.id == ^id,
      select: d.cluster_id
    )
  end
  def for_user(query \\ __MODULE__, user_id) do
    from(i in query, where: i.user_id == ^user_id)
  end

  @valid ~w(name agent requested_model repositories config_options agent_billing max_running_threads status
            status_reason actor_ref template_revision image_digest restore_fidelity foreground_state viewers
            viewer_lease_until keep_awake_until keep_awake_by_id awake_since index_revision status_generation
            lease_generation running_threads waiting_threads started_at suspended_at completed_at last_activity_at
            credentials_revoked_at workbench_id devbox_id snapshot_id user_id daemon_version rebase_state
            rebase_error rebase_revision rebase_attempts rebase_requested_at last_rebased_at update_deadline_at
            update_campaign_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:agent_connections, with: &connection_changeset/2)
    |> cast_embed(:idle_state, with: &idle_changeset/2)
    |> cast_embed(:checkouts, with: &checkout_changeset/2)
    |> foreign_key_constraint(:workbench_id)
    |> foreign_key_constraint(:devbox_id)
    |> foreign_key_constraint(:snapshot_id)
    |> validate_number(:max_running_threads, greater_than: 0)
    |> update_change(:rebase_error, &Console.truncate(&1, 2000))
    |> validate_transition()
    |> status_timestamps()
    |> validate_required([:workbench_id, :devbox_id, :agent, :status])
  end

  defp validate_transition(%Ecto.Changeset{data: %{status: from}} = cs) do
    with to when not is_nil(to) <- get_change(cs, :status),
         false <- can_transition?(from, to) do
      add_error(cs, :status, "cannot transition a devbox instance from #{from} to #{to}")
    else
      _ -> cs
    end
  end

  defp status_timestamps(cs) do
    case get_change(cs, :status) do
      nil -> cs
      status -> stamp(cs, status)
    end
  end

  defp stamp(%Ecto.Changeset{data: %{started_at: started, awake_since: awake}} = cs, :running) do
    now = DateTime.utc_now()
    cs
    |> put_change(:started_at, started || now)
    |> put_change(:awake_since, awake || now)
  end
  defp stamp(cs, :suspended) do
    cs
    |> put_change(:suspended_at, DateTime.utc_now())
    |> put_change(:awake_since, nil)
  end
  defp stamp(cs, status) when status in @terminal do
    cs
    |> put_change(:completed_at, DateTime.utc_now())
    |> put_change(:awake_since, nil)
  end
  defp stamp(cs, _), do: cs

  defp connection_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(agent protocol_version adapter_name adapter_version capabilities billing)a)
    |> validate_required([:agent])
  end

  defp checkout_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(path name remote_url default_branch branch head_sha dirty worktree_thread_id ahead behind)a)
  end

  defp idle_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(idle idle_since busy_reasons suspends_at message)a)
  end
end
