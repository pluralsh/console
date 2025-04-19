defmodule Console.Schema.KnowledgeRelationship do
  use Piazza.Ecto.Schema
  alias Console.Schema.{KnowledgeEntity, Flow}

  schema "knowledge_relationships" do
    field      :type, :string
    belongs_to :from, KnowledgeEntity
    belongs_to :to,   KnowledgeEntity

    timestamps()
  end

  def for_parent(query \\ __MODULE__, parent)
  def for_parent(query, %Flow{id: flow_id}) do
    from(r in query,
      join: f in assoc(r, :from), as: :from,
      join: t in assoc(r, :to), as: :to,
      where: f.flow_id == ^flow_id and t.flow_id == ^flow_id
    )
  end

  def by_names(query \\ __MODULE__, relation_names) do
    conditions = Enum.reduce(relation_names, true, fn %{from: from, to: to, type: type}, acc ->
      dynamic([r, from: f, to: t], f.name == ^from and t.name == ^to and r.type == ^type or ^acc)
    end)
    from(r in query, where: ^conditions)
  end

  @valid ~w(from_id to_id type)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> foreign_key_constraint(:from_id)
    |> foreign_key_constraint(:to_id)
    |> unique_constraint([:from_id, :to_id, :type])
  end
end
