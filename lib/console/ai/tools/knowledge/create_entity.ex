defmodule Console.AI.Tools.Knowledge.CreateEntity do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.AI.Tool
  alias Console.AI.Chat.Knowledge
  alias Console.Schema.{Flow}

  embedded_schema do
    field :name, :string
    field :type, :string
    field :description, :string
  end

  @valid ~w(name type description)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(name type)a)
  end

  @json_schema Console.priv_file!("tools/knowledge/create_entity.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("create_entity")
  def description(), do: "Creates a new entity in the knowledge graph"

  def implement(%__MODULE__{} = query) do
    case Tool.flow() do
      %Flow{} = flow ->
        Knowledge.create_entity(flow, Map.take(query, [:name, :type, :description]))
        |> when_ok(&jsonify/1)
        |> error()
      _ -> {:error, "no flow found"}
    end
  end
end
