defmodule Console.Schema.UpgradeInsight do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, UpgradeInsightDetail}

  defenum Status, passing: 0, failed: 1, unknown: 2, warning: 3

  schema "upgrade_insights" do
    field :name,            :string
    field :version,         :string
    field :description,     :string
    field :status,          Status
    field :refreshed_at,    :utc_datetime_usec
    field :transitioned_at, :utc_datetime_usec

    has_many :details, UpgradeInsightDetail,
      foreign_key: :insight_id,
      on_replace: :delete
    belongs_to :cluster, Cluster

    timestamps()
  end

  def for_cluster(query \\ __MODULE__, id) do
    from(ui in query, where: ui.cluster_id == ^id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :version, asc: :name]) do
    from(ui in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name version description status refreshed_at transitioned_at)a)
    |> cast_assoc(:details)
    |> foreign_key_constraint(:cluster_id)
    |> validate_required(~w(name version status cluster_id)a)
  end
end
