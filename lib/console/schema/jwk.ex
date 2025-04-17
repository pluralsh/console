defmodule Console.Schema.JWK do
  use Piazza.Ecto.Schema

  schema "jwks" do
    field :jwk, :map

    timestamps()
  end

  def limit(q \\ __MODULE__, limit) do
    from(j in q, limit: ^limit)
  end

  def jwks(%__MODULE__{id: id, jwk: jwk}), do: Map.put(jwk, "kid", id)

  def decode(%__MODULE__{jwk: jwk}), do: JOSE.JWK.from_map(jwk)

  def public(%__MODULE__{id: id} = jwk) do
    epk = decode(jwk)
    pub = JOSE.JWK.to_public(epk)
    {_, map} = JOSE.JWK.to_map(pub)
    Map.put(map, "kid", id)
  end

  def changeset(jwk, attrs) do
    jwk
    |> cast(attrs, [:jwk])
    |> validate_required([:jwk])
  end
end
