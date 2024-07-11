defmodule Console.Schema.Project do
  use Piazza.Ecto.Schema
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{PolicyBinding, User}

  schema "projects" do
    field :name,        :string
    field :description, :string
    field :default,     :boolean
    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id
    has_many :write_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :write_policy_id

    timestamps()
  end

  def search(query \\ __MODULE__, q) do
    from(p in query, where: ilike(p.name, ^"%#{q}%"))
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(p in query,
        left_join: b in PolicyBinding,
          on: b.policy_id == p.read_policy_id or b.policy_id == p.write_policy_id,
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name description default)a)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> foreign_key_constraint(:id, name: :stacks, match: :prefix, message: "there is an active stack in this project")
    |> foreign_key_constraint(:id, name: :clusters, match: :prefix, message: "there is an active cluster in this project")
    |> foreign_key_constraint(:id, name: :pipelines, match: :prefix, message: "there is an active pipeline in this project")
    |> foreign_key_constraint(:id, name: :global_services, match: :prefix, message: "there is an active global_service in this project")
    |> foreign_key_constraint(:id, name: :managed_namespaces, match: :prefix, message: "there is an active managed_namespace in this project")
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_required(~w(name)a)
  end

  def rbac_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [])
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
  end
end
