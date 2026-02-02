defmodule Console.Schema.ClusterUpgrade do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, User, ClusterUpgradeStep, AgentRuntime}

  defenum Status, pending: 0, in_progress: 1, completed: 2, failed: 3

  schema "cluster_upgrades" do
    field :version, :string
    field :prompt, :string
    field :status,  Status, default: :pending

    belongs_to :cluster, Cluster
    belongs_to :user, User
    belongs_to :runtime, AgentRuntime

    has_many :steps, ClusterUpgradeStep, foreign_key: :upgrade_id, on_replace: :delete

    timestamps()
  end

  def expired(query \\ __MODULE__) do
    from(cu in query, where: cu.inserted_at < ago(7, "day"))
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(cu in query, order_by: ^order)
  end

  @valid ~w(version status cluster_id user_id runtime_id prompt)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:steps)
    |> foreign_key_constraint(:cluster_id)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:runtime_id)
    |> validate_required([:version, :status, :cluster_id, :user_id])
  end
end
