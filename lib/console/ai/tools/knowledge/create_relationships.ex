defmodule Console.AI.Tools.Knowledge.CreateRelationships do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.AI.Tool
  alias Console.AI.Chat.Knowledge
  alias Console.Schema.{Flow}

  embedded_schema do
    embeds_many :relationships, Relationship do
      field :from, :string
      field :to, :string
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

  def relationship_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(from to type)a)
    |> validate_required(~w(from to type)a)
  end

  @json_schema Console.priv_file!("tools/knowledge/create_relationships.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("create_relationships")
  def description(), do: "Creates relationships between entities in the knowledge graph.  Relationships should be an active voice predicate"

  def implement(%__MODULE__{relationships: relationships}) do
    case Tool.flow() do
      %Flow{} = flow ->
        Knowledge.create_relationships(flow, relationships)
        |> when_ok(& "Created #{&1} relationships")
        |> error()
      _ -> {:error, "no flow found"}
    end
  end
end
