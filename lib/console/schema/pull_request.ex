defmodule Console.Schema.PullRequest do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, Service, PolicyBinding, Stack, Flow, PrGovernance}

  defenum Status, open: 0, merged: 1, closed: 2

  schema "pull_requests" do
    field :url,        :string
    field :status,     Status, default: :open
    field :title,      :string
    field :body,       :string
    field :creator,    :string
    field :labels,     {:array, :string}
    field :ref,        :string
    field :sha,        :string
    field :polled_sha, :string
    field :commit_sha, :string
    field :approver,   :string
    field :preview,    :string
    field :attributes, :map
    field :patch,      :binary
    field :agent_id,   :string
    field :approved,   :boolean, default: false
    field :governance_state, :map

    field :notifications_policy_id, :binary_id

    field :comment_id, :string, virtual: true

    belongs_to :cluster,    Cluster
    belongs_to :service,    Service
    belongs_to :stack,      Stack
    belongs_to :flow,       Flow
    belongs_to :governance, PrGovernance

    has_many :notifications_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :notifications_policy_id

    timestamps()
  end

  def icon(%__MODULE__{status: :merged}), do: "✔"
  def icon(%__MODULE__{status: :closed}), do: "❌"
  def icon(_), do: ""

  def open(query \\ __MODULE__) do
    from(pr in query, where: pr.status == ^:open)
  end

  def search(query \\ __MODULE__, q) do
    from(pr in query, where: ilike(pr.title, ^"%#{q}%"))
  end

  def for_cluster(query \\ __MODULE__, cid) do
    from(pr in query, where: pr.cluster_id == ^cid)
  end

  def for_service(query \\ __MODULE__, sid) do
    from(pr in query, where: pr.service_id == ^sid)
  end

  def for_stack(query \\ __MODULE__, stack_id) do
    from(pr in query, where: pr.stack_id == ^stack_id)
  end

  def for_flow(query \\ __MODULE__, flow_id) do
    from(pr in query, where: pr.flow_id == ^flow_id)
  end

  def for_agent(query \\ __MODULE__, agent_id) do
    from(pr in query, where: pr.agent_id == ^agent_id)
  end

  def pending_governance(query \\ __MODULE__) do
    from(pr in query, where: not is_nil(pr.governance_id) and not pr.approved and pr.status == ^:open)
  end

  def stack(query \\ __MODULE__) do
    from(pr in query, where: not is_nil(pr.stack_id))
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(pr in query, order_by: ^order)
  end

  def stream(query \\ __MODULE__), do: ordered(query, asc: :id)

  @valid ~w(
    url
    ref
    sha
    commit_sha
    approver
    status
    title
    body
    cluster_id
    stack_id
    service_id
    flow_id
    creator
    labels
    preview
    patch
    agent_id
    governance_id
    approved
    governance_state
  )a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:notifications_bindings)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> foreign_key_constraint(:stack_id)
    |> foreign_key_constraint(:flow_id)
    |> put_new_change(:notifications_policy_id, &Ecto.UUID.generate/0)
    |> unique_constraint(:url)
    |> validate_required(~w(url title)a)
  end
end
