defmodule Console.Schema.ConstraintViolation do
  use Piazza.Ecto.Schema
  alias Console.Schema.PolicyConstraint

  schema "constraint_violations" do
    field :group,     :string
    field :version,   :string
    field :kind,      :string
    field :namespace, :string
    field :name,      :string
    field :message,   :string

    belongs_to :constraint, PolicyConstraint

    timestamps()
  end

  @valid ~w(group version kind namespace name message constraint_id)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(name kind message)a)
  end
end
