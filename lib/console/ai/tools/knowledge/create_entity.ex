defmodule Console.AI.Tools.Knowledge.CreateEntity do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.AI.Chat.Knowledge

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
    for_parent(fn parent ->
      Knowledge.create_entity(parent, to_attrs(query))
      |> when_ok(&format_response!/1)
      |> error()
    end)
  end

  defp format_response!(e) do
    Map.take(e, [:id, :name, :type, :description])
    |> Map.put(:observations, Enum.map(e.observations, &Map.take(&1, [:observation])))
    |> Jason.encode!()
  end

  defp to_attrs(%__MODULE__{observations: obs} = query) do
    Map.take(query, [:name, :type, :description])
    |> Map.put(:observations, observations(obs))
  end

  defp observations([_ | _] = obs), do: Enum.map(obs, &Map.take(&1, [:observation]))
  defp observations(_), do: []
end
