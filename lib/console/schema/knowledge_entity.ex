defmodule Console.Schema.KnowledgeEntity do
  use Piazza.Ecto.Schema
  alias Console.Schema.{Flow, KnowledgeObservation, KnowledgeRelationship}

  schema "knowledge_entities" do
    field :name,        :string
    field :type,        :string
    field :description, :string

    belongs_to :flow, Flow

    has_many :observations, KnowledgeObservation,
      on_replace: :delete,
      foreign_key: :entity_id
    has_many :relations,    KnowledgeRelationship,
      on_replace: :delete,
      foreign_key: :from_id

    timestamps()
  end

  def for_parent(query \\ __MODULE__, parent)
  def for_parent(query, %Flow{id: flow_id}) do
    from(e in query, where: e.flow_id == ^flow_id)
  end

  def search(query \\ __MODULE__, q) do
    from(e in query, where: ilike(e.name, ^"%#{q}%") or ilike(e.type, ^"%#{q}%"))
  end

  def for_flow(query \\ __MODULE__, flow_id) do
    from(e in query, where: e.flow_id == ^flow_id)
  end

  @valid ~w(name type description)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_assoc(:observations)
    |> cast_assoc(:relations)
    |> validate_required(~w(name type)a)
    |> foreign_key_constraint(:flow_id)
    |> unique_constraint([:flow_id, :name])
    |> validate_length(:name, max: 255)
    |> validate_length(:description, max: 1000)
  end
end
