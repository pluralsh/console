defmodule Console.Schema.DeployToken do
  use Piazza.Ecto.Schema
  alias Console.Schema.Cluster

  @expiry [days: -7]

  schema "deploy_tokens" do
    field :token, :string

    belongs_to :cluster, Cluster

    timestamps()
  end

  def expired(query \\ __MODULE__) do
    expiry = Timex.now() |> Timex.shift(@expiry)
    from(dt in query, where: dt.inserted_at <= ^expiry)
  end

  @valid ~w(token cluster_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> unique_constraint(:token)
    |> foreign_key_constraint(:cluster_id)
    |> validate_required(@valid)
  end
end
