defmodule Console.Schema.PolicyConstraint do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, ConstraintViolation}

  schema "policy_constraints" do
    field :name,            :string
    field :description,     :string
    field :recommendation,  :string
    field :violation_count, :integer

    embeds_one :ref, Ref, on_replace: :update do
      field :kind, :string
      field :name,  :string
    end

    has_many :violations, ConstraintViolation,
      on_replace: :delete,
      foreign_key: :constraint_id
    belongs_to :cluster, Cluster

    timestamps()
  end

  def without_names(query \\ __MODULE__, names) do
    from(p in query, where: p.name not in ^names)
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(p in query, where: p.cluster_id == ^cluster_id)
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(name description recommendation violation_count)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:ref, with: &ref_changeset/2)
    |> cast_assoc(:violations)
    |> foreign_key_constraint(:cluster_id)
    |> validate_required([:name, :ref])
  end

  @ref_valid ~w(kind name)a

  defp ref_changeset(model, attrs) do
    model
    |> cast(attrs, @ref_valid)
    |> validate_required(@ref_valid)
  end
end
