defmodule Console.AI.Tools.Knowledge.DeleteObservations do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.AI.Chat.Knowledge

  embedded_schema do
    field :name, :string
    field :observations, {:array, :string}
  end

  @valid ~w(name observations)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(~w(name observations)a)
  end

  @json_schema Console.priv_file!("tools/knowledge/delete_observations.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("delete_observations")
  def description(), do: "Deletes observations for an entity in the knowledge graph"

  def implement(%__MODULE__{name: name,observations: observations}) do
    for_parent(fn parent ->
      Knowledge.delete_observations(parent, name, observations)
      |> when_ok(& "Deleted #{&1} observations")
      |> error()
    end)
  end
end
