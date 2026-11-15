defmodule Console.Schema.WorkloadIdentityKey do
  @moduledoc """
  An RS256 signing key of a workload identity issuer.  The private JWK is encrypted at rest.

  Keys move `pending` (published in the JWKS, not yet signing) -> `active` (signing) -> `retired` (published until
  every token it signed has expired) -> `revoked` (never published again, for emergency rotation).
  """
  use Console.Schema.Base
  alias Piazza.Ecto.EncryptedString
  alias Console.Schema.WorkloadIdentityIssuer

  defenum State, pending: 0, active: 1, retired: 2, revoked: 3

  schema "workload_identity_keys" do
    field :kid,          :string
    field :private_jwk,  EncryptedString
    field :public_jwk,   :map
    field :state,        State, default: :pending
    field :activated_at, :utc_datetime_usec
    field :retired_at,   :utc_datetime_usec
    field :expires_at,   :utc_datetime_usec

    belongs_to :issuer, WorkloadIdentityIssuer

    timestamps()
  end

  @doc "A fresh 2048 bit RSA key, as changeset attributes"
  @spec generate() :: map
  def generate() do
    jwk = JOSE.JWK.generate_key({:rsa, 2048})
    kid = Console.rand_alphanum(24)
    {_, private} = JOSE.JWK.to_map(jwk)
    {_, public} = JOSE.JWK.to_public_map(jwk)
    %{
      kid: kid,
      private_jwk: Jason.encode!(private),
      public_jwk: Map.merge(public, %{"kid" => kid, "alg" => "RS256", "use" => "sig"})
    }
  end

  @spec jwk(t) :: JOSE.JWK.t
  def jwk(%__MODULE__{private_jwk: private}), do: private |> Jason.decode!() |> JOSE.JWK.from_map()

  def for_issuer(query \\ __MODULE__, issuer_id) do
    from(k in query, where: k.issuer_id == ^issuer_id)
  end

  def for_states(query \\ __MODULE__, states) do
    from(k in query, where: k.state in ^states)
  end

  @doc "Keys served in the JWKS: pending, active and retired keys whose tokens may still be live"
  def published(query \\ __MODULE__) do
    now = DateTime.utc_now()
    from(k in query,
      where: k.state in ^[:pending, :active] or (k.state == ^:retired and (is_nil(k.expires_at) or k.expires_at > ^now))
    )
  end

  def expired(query \\ __MODULE__) do
    now = DateTime.utc_now()
    from(k in query, where: k.state == ^:retired and k.expires_at <= ^now)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :inserted_at]) do
    from(k in query, order_by: ^order)
  end

  def limit(query \\ __MODULE__, limit) do
    from(k in query, limit: ^limit)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(issuer_id kid private_jwk public_jwk state activated_at retired_at expires_at)a)
    |> validate_required(~w(issuer_id kid private_jwk public_jwk state)a)
    |> unique_constraint(:kid)
  end
end
