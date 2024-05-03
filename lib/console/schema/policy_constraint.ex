defmodule Console.Schema.PolicyConstraint do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Cluster, ConstraintViolation}

  defenum Enforcement, warn: 0, deny: 1, dry_run: 2

  schema "policy_constraints" do
    field :name,            :string
    field :description,     :string
    field :recommendation,  :string
    field :violation_count, :integer
    field :enforcement,     Enforcement

    embeds_one :ref, Ref, on_replace: :update do
      field :kind, :string
      field :name, :string
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

  def for_user(query \\ __MODULE__, user) do
    clusters = Cluster.for_user(user)
    from(p in query,
      join: c in subquery(clusters),
        as: :clusters,
        on: c.id == p.cluster_id
    )
  end

  def globally_ordered(query \\ __MODULE__) do
    from([p, clusters: c] in query, order_by: [asc: c.name, asc: p.name])
  end

  def for_cluster(query \\ __MODULE__, cluster_id) do
    from(p in query, where: p.cluster_id == ^cluster_id)
  end

  def for_clusters(query \\ __MODULE__, cluster_ids) do
    from(p in query, where: p.cluster_id in ^cluster_ids)
  end

  def for_namespace(query \\ __MODULE__, ns) do
    from(p in query,
      join: v in assoc(p, :violations),
      where: v.namespace == ^ns
    )
  end

  def for_kind(query \\ __MODULE__, kind) do
    from(p in query,
      join: v in assoc(p, :violations),
      where: v.kind == ^kind
    )
  end

  def for_namespaces(query \\ __MODULE__, ns) do
    from(p in query,
      join: v in assoc(p, :violations),
      where: v.namespace in ^ns
    )
  end

  def for_kinds(query \\ __MODULE__, kinds) do
    from(p in query,
      join: v in assoc(p, :violations),
      where: v.kind in ^kinds
    )
  end

  def search(query \\ __MODULE__, q) do
    from(p in query, where: ilike(p.name, ^"%#{q}%"))
  end

  def statistics(query \\ __MODULE__, field) do
    from(p in query,
      join: v in assoc(p, :violations),
      group_by: field(v, ^field),
      select: %{value: field(v, ^field), violations: count(v.id, :distinct), count: count(p.id, :distinct)}
    )
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]) do
    from(p in query, order_by: ^order)
  end

  @valid ~w(name description recommendation violation_count enforcement)a

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
