defmodule Console.Schema.DevboxInstanceSession do
  use Console.Schema.Base
  alias Console.Schema.{Devbox, DevboxInstance, DevboxInstanceInteraction, PullRequest, User}

  defenum Kind, thread: 0, subagent: 1
  defenum Status, active: 0, waiting: 1, closed: 2, deleted: 3

  defmodule ConfigOption do
    use Console.Schema.Base

    embedded_schema do
      field :config_id,     :string
      field :name,          :string
      field :description,   :string
      field :category,      :string
      field :type,          :string
      field :current_value, :string

      embeds_many :options, Value, on_replace: :delete do
        field :value,       :string
        field :name,        :string
        field :description, :string
        field :group,       :string
      end
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(config_id name description category type current_value)a)
      |> cast_embed(:options, with: &value_changeset/2)
      |> validate_required([:config_id])
    end

    defp value_changeset(model, attrs) do
      model
      |> cast(attrs, ~w(value name description group)a)
      |> validate_required([:value])
    end

    @spec values(t) :: [binary]
    def values(%__MODULE__{options: options}), do: Enum.map(options || [], & &1.value)
  end

  defmodule QueuedPrompt do
    use Console.Schema.Base

    embedded_schema do
      field :prompt_id,    :string
      field :text,         :string
      field :attachments,  {:array, :string}
      field :queued_at,    :utc_datetime_usec
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(prompt_id text attachments queued_at)a)
      |> validate_required([:prompt_id])
    end
  end

  defmodule Command do
    use Console.Schema.Base

    embedded_schema do
      field :name,        :string
      field :description, :string
      field :input_hint,  :string
    end

    def changeset(model, attrs \\ %{}) do
      model
      |> cast(attrs, ~w(name description input_hint)a)
      |> validate_required([:name])
    end
  end

  schema "devbox_instance_sessions" do
    field :acp_session_id,        :string
    field :kind,                  Kind, default: :thread
    field :parent_acp_session_id, :string
    field :agent,                 Devbox.AgentType
    field :title,                 :string
    field :user_title,            :string
    field :cwd,                   :string
    field :worktree_repos,        {:array, :string}
    field :worktree_path,         :string
    field :status,                Status, default: :active
    field :imported,              :boolean, default: false
    field :last_activity_at,      :utc_datetime_usec
    field :entity_count,          :integer, default: 0
    field :foreground_state,      DevboxInstance.ForegroundState, default: :idle
    field :stop_reason,           :string
    field :error,                 :map
    field :background_work,       :map
    field :billing,               :string
    field :revision,              :integer, default: 0
    field :parent_tool_call_id,   :string

    embeds_many :config_options,     ConfigOption, on_replace: :delete
    embeds_many :available_commands, Command, on_replace: :delete
    embeds_many :queued_prompts,     QueuedPrompt, on_replace: :delete

    embeds_one :usage, Usage, on_replace: :update do
      field :input_tokens,     :integer
      field :output_tokens,    :integer
      field :cached_tokens,    :integer
      field :reasoning_tokens, :integer
      field :total_tokens,     :integer
      field :context_size,     :integer
      field :context_used,     :integer
      field :total_cost,       :float
      field :currency,         :string
    end

    belongs_to :instance, DevboxInstance
    belongs_to :parent,   __MODULE__
    belongs_to :user,     User

    has_many :children,      __MODULE__, foreign_key: :parent_id
    has_many :interactions,  DevboxInstanceInteraction, foreign_key: :session_id
    has_many :pull_requests, PullRequest, foreign_key: :devbox_instance_session_id

    timestamps()
  end

  @doc """
  The title users see: a user rename wins over the agent-owned title.
  """
  @spec display_title(t) :: binary | nil
  def display_title(%__MODULE__{user_title: t}) when is_binary(t), do: t
  def display_title(%__MODULE__{title: t}), do: t

  @doc """
  The current value of the thread's model-category config option, as reported by the agent.
  """
  @spec model(t) :: binary | nil
  def model(%__MODULE__{config_options: [_ | _] = opts}) do
    case Enum.find(opts, & &1.category == "model") do
      %ConfigOption{current_value: v} -> v
      _ -> nil
    end
  end
  def model(_), do: nil

  @doc """
  Where a thread sits in its lifecycle: `:needs_review` only while an interaction (a permission or question) is
  pending, `:running` while a turn is in flight or queued, otherwise `:completed` (its last turn finished or
  failed, or it was closed).  `for_stages/2` is the same rule as a query.
  """
  @spec stage(map) :: :running | :needs_review | :completed
  def stage(%{status: s}) when s in [:closed, :deleted], do: :completed
  def stage(%{foreground_state: :requires_action}), do: :needs_review
  def stage(%{status: :waiting}), do: :running
  def stage(%{foreground_state: :running}), do: :running
  def stage(_), do: :completed

  def for_stages(query \\ __MODULE__, stages) do
    conditions = Enum.reduce(stages, dynamic(false), fn
      :completed, acc ->
        dynamic([s], ^acc or s.status in ^[:closed, :deleted] or
                              (s.foreground_state not in ^[:requires_action, :running] and s.status != ^:waiting))
      :running, acc ->
        dynamic([s], ^acc or (s.status not in ^[:closed, :deleted] and s.foreground_state != ^:requires_action and
                              (s.status == ^:waiting or s.foreground_state == ^:running)))
      :needs_review, acc ->
        dynamic([s], ^acc or (s.status not in ^[:closed, :deleted] and s.foreground_state == ^:requires_action))
      _, acc -> acc
    end)
    from(s in query, where: ^conditions)
  end

  def for_instance(query \\ __MODULE__, instance_id) do
    from(s in query, where: s.instance_id == ^instance_id)
  end

  def for_kind(query \\ __MODULE__, kind) do
    from(s in query, where: s.kind == ^kind)
  end

  def for_acp_ids(query \\ __MODULE__, ids) do
    from(s in query, where: s.acp_session_id in ^ids)
  end

  def for_acp_id(query \\ __MODULE__, id) do
    from(s in query, where: s.acp_session_id == ^id)
  end

  def with_ids(query \\ __MODULE__, ids) do
    from(s in query, where: s.id in ^ids)
  end

  def without_session(query \\ __MODULE__) do
    from(s in query, where: is_nil(s.acp_session_id))
  end

  def orphans_of(query \\ __MODULE__, parent_acp_session_id) do
    from(s in query, where: is_nil(s.parent_id) and s.parent_acp_session_id == ^parent_acp_session_id)
  end

  def visible(query \\ __MODULE__) do
    from(s in query, where: s.status != ^:deleted)
  end

  def running(query \\ __MODULE__) do
    from(s in query, where: s.foreground_state == ^:running)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(s in query, order_by: ^order)
  end

  @valid ~w(instance_id acp_session_id kind parent_id parent_acp_session_id agent title user_title cwd worktree_repos
            worktree_path status imported user_id last_activity_at entity_count foreground_state stop_reason error
            background_work billing revision parent_tool_call_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:config_options)
    |> cast_embed(:available_commands)
    |> cast_embed(:queued_prompts)
    |> cast_embed(:usage, with: &usage_changeset/2)
    |> foreign_key_constraint(:instance_id)
    |> foreign_key_constraint(:parent_id)
    |> unique_constraint([:instance_id, :acp_session_id])
    |> validate_length(:title, max: 255)
    |> validate_length(:user_title, max: 255)
    |> validate_cwd()
    |> validate_required([:instance_id, :kind, :status])
  end

  defp validate_cwd(cs) do
    validate_change(cs, :cwd, fn :cwd, cwd ->
      case String.match?(cwd, ~r/^~(\/[A-Za-z0-9._-]+)?$/) do
        true -> []
        false -> [cwd: "must be ~ or ~/<repository>"]
      end
    end)
  end

  defp usage_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(input_tokens output_tokens cached_tokens reasoning_tokens total_tokens context_size context_used total_cost currency)a)
  end
end
