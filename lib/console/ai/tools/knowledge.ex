defmodule Console.AI.Tools.Knowledge do
  use Ecto.Schema
  import Ecto.Changeset
  alias Console.AI.Tools.Knowledge.Graph

  embedded_schema do
    field :required, :boolean
    field :query,    :string
  end

  @valid ~w(required query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/knowledge.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: :knowledge_graph
  def description(), do: "Determines whether searching our knowledge graph on the current issue is appropriate and if so, what to search for"

  def implement(%__MODULE__{required: false}),
    do: {:error, :ignore}
  def implement(%__MODULE__{} = knowledge) do
    %Graph{query: knowledge.query}
    |> Graph.implement()
  end
end
