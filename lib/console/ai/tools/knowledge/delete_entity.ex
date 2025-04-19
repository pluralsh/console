defmodule Console.AI.Tools.Knowledge.DeleteEntity do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.AI.Chat.Knowledge

  embedded_schema do
    field :name, :string
  end

  @valid ~w(name)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(name)a)
  end

  @json_schema Console.priv_file!("tools/knowledge/delete_entity.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("delete_entity")
  def description(), do: "Deletes an entity from the knowledge graph"

  def implement(%__MODULE__{name: name}) do
    for_parent(fn parent ->
      Knowledge.delete_entity(parent, name)
      |> when_ok(& "Successfully deleted entity #{&1.name}")
      |> error()
    end)
  end
end
