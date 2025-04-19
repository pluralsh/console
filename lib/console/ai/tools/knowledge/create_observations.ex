defmodule Console.AI.Tools.Knowledge.CreateObservations do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.AI.Tool
  alias Console.AI.Chat.Knowledge
  alias Console.Schema.{Flow}

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
  def name(), do: plrl_tool("create_observations")
  def description(), do: "Creates observations for an entity in the knowledge graph"

  def implement(%__MODULE__{name: name, observations: observations}) do
    case Tool.flow() do
      %Flow{} = flow ->
        Knowledge.create_observations(flow, name, observations)
        |> when_ok(& "Created #{&1} observations")
        |> error()
      _ -> {:error, "no flow found"}
    end
  end
end
