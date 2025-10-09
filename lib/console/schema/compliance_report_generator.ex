defmodule Console.Schema.ComplianceReportGenerator do
  use Piazza.Ecto.Schema
  alias Console.Deployments.Policies.Rbac
  alias Console.Schema.{PolicyBinding, User}

  defenum Format, csv: 0, json: 1

  schema "compliance_report_generators" do
    field :name,           :string
    field :format,         Format
    field :read_policy_id, :binary_id

    has_many :read_bindings, PolicyBinding,
      on_replace: :delete,
      foreign_key: :policy_id,
      references: :read_policy_id

    timestamps()
  end

  def for_user(query \\ __MODULE__, %User{} = user) do
    Rbac.globally_readable(query, user, fn query, id, groups ->
      from(c in query,
        join: b in assoc(c, :read_bindings),
        where: b.user_id == ^id or b.group_id in ^groups,
        distinct: true
      )
    end)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(q in query, order_by: ^order)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [:name, :format])
    |> validate_length(:name, max: 255)
    |> cast_assoc(:read_bindings)
    |> put_new_change(:read_policy_id, &Ecto.UUID.generate/0)
    |> unique_constraint(:name)
    |> validate_required([:name, :format])
  end
end
