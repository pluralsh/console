defmodule Console.AI.Tools.Knowledge.DeleteRelationships do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.AI.Chat.Knowledge

  embedded_schema do
    embeds_many :relationships, Relationship do
      field :from, :string
      field :to,   :string
      field :type, :string
    end
  end

  @valid ~w(relationships)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:relationships, with: &relationship_changeset/2)
    |> validate_required(~w(relationships)a)
  end

  defp relationship_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(from to type)a)
    |> validate_required(~w(from to type)a)
  end

  @json_schema Console.priv_file!("tools/knowledge/delete_relationships.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("delete_relationships")
  def description(), do: "Deletes relationships between entities in the knowledge graph"

  def implement(%__MODULE__{relationships: relationships}) do
    for_parent(fn parent ->
      Knowledge.delete_relationships(parent, relationships)
      |> when_ok(& "Deleted #{&1} relationships")
      |> error()
    end)
  end
end
