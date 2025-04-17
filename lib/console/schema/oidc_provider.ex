defmodule Console.Schema.OIDCProvider do
  use Piazza.Ecto.Schema
  alias Console.Schema.{PolicyBinding, User}
  alias Console.Deployments.Policies.Rbac

  defenum AuthMethod, post: 0, basic: 1

  schema "oidc_providers" do
    field :name,              :string
    field :description,       :string
    field :icon,              :string
    field :client_id,         :string
    field :client_secret,     :string
    field :redirect_uris,     {:array, :string}
    field :auth_method,       AuthMethod
    field :bindings_id,       :binary_id
    field :write_policy_id,   :binary_id

    field :login,   :map, virtual: true
    field :consent, :map, virtual: true

    has_many :bindings, PolicyBinding,
      on_replace:  :delete,
      foreign_key: :policy_id,
      references:  :bindings_id

    has_many :write_bindings, PolicyBinding,
      on_replace:  :delete,
      foreign_key: :policy_id,
      references:  :write_policy_id

    timestamps()
  end

  def search(query \\ __MODULE__, q) do
    from(f in query, where: ilike(f.name, ^"%#{q}%"))
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(o in query,
        join: b in PolicyBinding,
          on: b.policy_id == o.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(name description icon client_id client_secret redirect_uris auth_method)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:bindings)
    |> cast_assoc(:write_bindings)
    |> put_new_change(:bindings_id, &Ecto.UUID.generate/0)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> unique_constraint(:client_id)
    |> validate_required(~w(name client_id client_secret redirect_uris auth_method)a)
  end
end
