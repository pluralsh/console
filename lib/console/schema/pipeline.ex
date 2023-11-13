defmodule Console.Schema.Pipeline do
  use Piazza.Ecto.Schema
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{PolicyBinding, PipelineStage, PipelineEdge, User}

  schema "pipelines" do
    field :name,            :string
    field :write_policy_id, :binary_id
    field :read_policy_id,  :binary_id

    has_many :stages, PipelineStage, on_replace: :delete
    has_many :edges,  PipelineEdge, on_replace: :delete

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

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, ~w(name)a)
    |> cast_assoc(:stages)
    |> cast_assoc(:edges)
    |> cast_assoc(:read_bindings)
    |> cast_assoc(:write_bindings)
    |> put_new_change(:write_policy_id, &Ecto.UUID.generate/0)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> validate_required(~w(name)a)
  end
end
