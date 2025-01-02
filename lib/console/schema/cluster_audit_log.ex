defmodule Console.Schema.ClusterAuditLog do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, User}

  @expires [days: -30]

  schema "cluster_audit_logs" do
    field :method, :string
    field :path,   :string

    belongs_to :cluster, Cluster
    belongs_to :actor,    User

    timestamps()
  end

  def expired(query \\ __MODULE__) do
    now = Timex.now() |> Timex.shift(@expires)
    from(al in query, where: al.inserted_at <= ^now)
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(al in query, where: al.cluster_id == ^cluster_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(al in query, order_by: ^order)
  end

  @valid ~w(method path cluster_id actor_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:cluster_id)
    |> validate_required(@valid)
  end
end
