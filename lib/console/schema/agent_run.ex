defmodule Console.Schema.AgentRun do
  use Piazza.Ecto.Schema
  alias Console.Schema.{AgentRuntime, User, Flow, NamespacedName, PullRequest}

  defenum Status, pending: 0, running: 1, successful: 2, failed: 3, cancelled: 4

  schema "agent_runs" do
    field :status,        Status
    field :prompt,        :binary
    field :repository,    :string

    embeds_one :pod_reference, NamespacedName, on_replace: :update

    belongs_to :runtime, AgentRuntime
    belongs_to :user,    User
    belongs_to :flow,    Flow

    has_many :pull_requests, PullRequest

    timestamps()
  end

  def for_runtime(query \\ __MODULE__, runtime_id) do
    from(ar in query, where: ar.runtime_id == ^runtime_id)
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(ar in query, where: ar.user_id == ^user_id)
  end

  def for_status(query \\ __MODULE__, status) do
    from(ar in query, where: ar.status == ^status)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(ar in query, order_by: ^order)
  end

  @valid ~w(status prompt repository runtime_id user_id flow_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:pod_reference)
    |> validate_required(~w(status prompt repository runtime_id user_id)a)
  end
end
