defmodule Console.AI.Tools.Knowledge.CreateEntity do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.AI.Tool
  alias Console.AI.Chat.Knowledge
  alias Console.Schema.{Flow}

  embedded_schema do
    field :name,        :string
    field :type,        :string
    field :description, :string

    embeds_many :observations, Observation do
      field :observation, :string
    end
  end

  @valid ~w(name type description)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:observations, with: &observation_changeset/2)
    |> validate_required(~w(name type)a)
  end

  defp observation_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(observation)a)
    |> validate_required(~w(observation)a)
  end

  @json_schema Console.priv_file!("tools/knowledge/create_entity.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("create_entity")
  def description(), do: "Creates a new entity in the knowledge graph"

  def implement(%__MODULE__{} = query) do
    case Tool.flow() do
      %Flow{} = flow ->
        Knowledge.create_entity(flow, to_attrs(query))
        |> when_ok(&jsonify!/1)
        |> error()
      _ -> {:error, "no flow found"}
    end
  end

  defp to_attrs(%__MODULE__{observations: obs} = query) do
    Map.take(query, [:name, :type, :description])
    |> Map.put(:observations, observations(obs))
  end

  defp observations([_ | _] = obs), do: Enum.map(obs, &Map.take(&1, [:observation]))
  defp observations(_), do: []
end
