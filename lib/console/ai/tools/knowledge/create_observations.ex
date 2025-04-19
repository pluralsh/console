defmodule Console.AI.Tools.Knowledge.CreateObservations do
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

  @json_schema Console.priv_file!("tools/knowledge/create_observations.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("add_observations")
  def description(), do: "Adds observations to a existing entities in the knowledge graph, only use this with known entity names"

  def implement(%__MODULE__{name: name, observations: observations}) do
    for_parent(fn parent ->
      Knowledge.create_observations(parent, name, observations)
      |> when_ok(& "Created #{&1} observations")
      |> error()
    end)
  end
end
