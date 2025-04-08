defmodule Console.Schema.OIDCProvider do
  use Piazza.Ecto.Schema
  alias Console.Schema.PolicyBinding

  defenum AuthMethod, post: 0, basic: 1

  schema "oidc_providers" do
    field :name,          :string
    field :description,   :string
    field :icon,          :string
    field :client_id,     :string
    field :client_secret, :string
    field :redirect_uris, {:array, :string}
    field :auth_method,   AuthMethod
    field :bindings_id,   :binary_id

    field :login,   :map, virtual: true
    field :consent, :map, virtual: true

    has_many :bindings, PolicyBinding,
      on_replace:  :delete,
      foreign_key: :policy_id,
      references:  :bindings_id

    timestamps()
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(name description icon client_id client_secret redirect_uris auth_method)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:bindings)
    |> put_new_change(:bindings_id, &Ecto.UUID.generate/0)
    |> unique_constraint(:client_id)
    |> validate_required(~w(name client_id client_secret redirect_uris auth_method)a)
  end
end
