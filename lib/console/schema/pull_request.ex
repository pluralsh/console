defmodule Console.Schema.PullRequest do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, Service, PolicyBinding}

  defenum Status, open: 0, merged: 1, closed: 2

  schema "pull_requests" do
    field :url,     :string
    field :status,  Status, default: :open
    field :title,   :string
    field :creator, :string
    field :labels,  {:array, :string}

    field :notifications_policy_id, :binary_id

    belongs_to :cluster, Cluster
    belongs_to :service, Service

    has_many :notifications_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :notifications_policy_id

    timestamps()
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

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(pr in query, order_by: ^order)
  end

  @valid ~w(url status title cluster_id service_id creator labels)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:notifications_bindings)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:service_id)
    |> put_new_change(:notifications_policy_id, &Ecto.UUID.generate/0)
    |> unique_constraint(:url)
    |> validate_required(~w(url title)a)
  end
end
