defmodule Console.AI.Tools.Knowledge.Graph do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.AI.Chat.Knowledge
  alias Console.Schema.KnowledgeEntity

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/knowledge/graph.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("knowledge_graph")
  def description(), do: "Searches the knowledge graph, try to use the query parameter where possible since the graph can be large, but leave empty if you want to fetch it entirely"

  def implement(%__MODULE__{query: query}) do
    for_parent(fn parent ->
      KnowledgeEntity.for_parent(parent)
      |> maybe_search(query)
      |> Knowledge.compile()
      |> format_graph()
    end)
  end

  defp maybe_search(query, q) when is_binary(q) and byte_size(q) > 0, do: KnowledgeEntity.search(query, q)
  defp maybe_search(query, _), do: query

  defp format_graph({entities, relationships}) do
    Jason.encode(%{
      entities: Enum.map(entities, &format_entities/1),
      relationships: Enum.map(relationships, &format_relations/1)
    })
  end

  defp format_entities(entity) do
    %{
      name: entity.name,
      type: entity.type,
      description: entity.description,
      observations: Enum.map(entity.observations, & &1.observation)
    }
  end

  defp format_relations(relationship) do
    %{
      from: relationship.from.name,
      to: relationship.to.name,
      type: relationship.type
    }
  end
end
