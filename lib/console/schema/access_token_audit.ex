defmodule Console.Schema.AccessTokenAudit do
  use Piazza.Ecto.Schema
  alias Console.Schema.AccessToken

  schema "access_token_audits" do
    field :ip,        :string
    field :timestamp, :utc_datetime_usec
    field :count,     :integer, default: 0

    belongs_to :token, AccessToken

    timestamps()
  end

  def for_token(query \\ __MODULE__, token_id) do
    from(a in query, where: a.token_id == ^token_id)
  end

  def ordered(query \\ __MODULE__, order \\ [desc: :timestamp]) do
    from(a in query, order_by: ^order)
  end

  @valid ~w(ip timestamp count token_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:token_id)
    |> validate_required(@valid)
  end
end
