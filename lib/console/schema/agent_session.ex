defmodule Console.Schema.AgentSession do
  use Piazza.Ecto.Schema
  alias Console.Schema.{CloudConnection, ChatThread, Stack, PullRequest, Service, Cluster}

  defenum Type, terraform: 0, kubernetes: 1, provisioning: 2, search: 3, manifests: 4, chat: 5

  schema "agent_sessions" do
    field :type,           Type
    field :agent_id,       :string
    field :plan_confirmed, :boolean
    field :prompt,         :string
    field :branch,         :string
    field :initialized,    :boolean, default: false
    field :commit_count,   :integer, default: 0
    field :done,           :boolean, default: false
    field :tf_planned,     :boolean, virtual: true, default: false
    field :tf_booted,      :boolean, virtual: true, default: false

    belongs_to :connection,   CloudConnection
    belongs_to :thread,       ChatThread
    belongs_to :stack,        Stack
    belongs_to :service,      Service
    belongs_to :pull_request, PullRequest
    belongs_to :cluster,      Cluster

    timestamps()
  end

  @agent_types ~w(terraform kubernetes)a

  def agent(query \\ __MODULE__) do
    from(s in query, where: s.type in ^@agent_types)
  end

  def for_user(query \\ __MODULE__, user_id) do
    from(s in query,
      join: t in assoc(s, :thread),
      where: t.user_id == ^user_id
    )
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(s in query, order_by: ^order)
  end

  @valid ~w(type done plan_confirmed connection_id thread_id stack_id service_id cluster_id pull_request_id prompt branch initialized commit_count)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> put_new_change(:agent_id, fn -> Console.rand_alphanum(16) end)
    |> unique_constraint(:agent_id)
    |> validate_required(~w(agent_id)a)
  end
end
