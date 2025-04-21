defmodule Console.Schema.KnowledgeObservation do
  use Piazza.Ecto.Schema
  alias Console.Schema.KnowledgeEntity

  schema "knowledge_observations" do
    field :observation, :string

    belongs_to :entity, KnowledgeEntity

    timestamps()
  end

  def for_entity(query \\ __MODULE__, entity_id) do
    from(o in query, where: o.entity_id == ^entity_id)
  end

  def for_observations(query \\ __MODULE__, observations) do
    from(o in query, where: o.observation in ^observations)
  end

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [:observation])
    |> validate_required([:observation])
    |> foreign_key_constraint(:entity_id)
  end
end
