defmodule Console.Schema.ClusterRestore do
  use Piazza.Ecto.Schema
  alias Console.Schema.{ClusterBackup}

  defenum Status, created: 0, pending: 1, successful: 2, failed: 3

  schema "cluster_restores" do
    field :status, Status

    belongs_to :backup, ClusterBackup

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, cid) do
    from(r in query,
      join: b in assoc(r, :backup),
      where: b.cluster_id == ^cid
    )
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :inserted_at]) do
    from(r in query, order_by: ^order)
  end

  @valid ~w(status backup_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:backup_id)
    |> validate_required(@valid)
  end
end
