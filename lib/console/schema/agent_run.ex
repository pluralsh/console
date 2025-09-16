defmodule Console.Schema.AgentRun do
  use Piazza.Ecto.Schema
  alias Console.Schema.{
    AgentRuntime,
    AgentPromptHistory,
    User,
    Flow,
    NamespacedName,
    PullRequest,
    AgentSession
  }

  @expiry 14

  defenum Status, pending: 0, running: 1, successful: 2, failed: 3, cancelled: 4
  defenum Mode, analyze: 0, write: 1

  schema "agent_runs" do
    field :status,        Status
    field :mode,          Mode, default: :write
    field :prompt,        :binary
    field :repository,    :string
    field :branch,        :string
    field :error,         :binary

    embeds_one :pod_reference, NamespacedName, on_replace: :update

    embeds_many :todos, Todo, on_replace: :delete do
      field :title,       :string
      field :description, :string
      field :done,        :boolean, default: false
    end

    embeds_one :analysis, Analysis, on_replace: :update do
      field :summary,  :string
      field :analysis, :string
      field :bullets,  {:array, :string}
    end

    belongs_to :runtime, AgentRuntime
    belongs_to :user,    User
    belongs_to :flow,    Flow
    belongs_to :session, AgentSession

    has_many :pull_requests, PullRequest
    has_many :prompts, AgentPromptHistory, foreign_key: :agent_run_id

    timestamps()
  end

  def for_runtime(query \\ __MODULE__, runtime_id) do
    from(ar in query, where: ar.runtime_id == ^runtime_id)
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(ar in query, where: ar.user_id == ^user_id)
  end

  def for_session(query \\ __MODULE__, session_id) do
    from(ar in query, where: ar.session_id == ^session_id)
  end

  def for_status(query \\ __MODULE__, status) do
    from(ar in query, where: ar.status == ^status)
  end

  def expired(query \\ __MODULE__) do
    expired = Timex.now() |> Timex.shift(days: -@expiry)
    from(ar in query, where: ar.inserted_at < ^expired)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(ar in query, order_by: ^order)
  end

  @valid ~w(status prompt repository runtime_id user_id flow_id session_id mode branch error)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:session_id)
    |> foreign_key_constraint(:runtime_id)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:flow_id)
    |> cast_embed(:pod_reference)
    |> cast_embed(:todos, with: &todo_changeset/2)
    |> cast_embed(:analysis, with: &analysis_changeset/2)
    |> validate_required(~w(status prompt repository runtime_id user_id mode)a)
  end

  defp todo_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(title description done)a)
    |> validate_required(~w(title description)a)
  end

  defp analysis_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(summary analysis bullets)a)
    |> validate_required(~w(summary analysis)a)
  end
end
