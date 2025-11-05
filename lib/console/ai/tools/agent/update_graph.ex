defmodule Console.AI.Tools.Agent.UpdateGraph do
  use Console.AI.Tools.Agent.Base
  alias Console.AI.Research.Graph

  embedded_schema do
    embeds_many :vertices, Vertex, on_replace: :delete do
      field :identifier,  :string
      field :type,        :string
      field :description, :string
    end

    embeds_many :edges, Edge, on_replace: :delete do
      field :from, :string
      field :to, :string
      field :type, :string
      field :description, :string
    end

    field :notes, {:array, :string}
    field :service_ids, {:array, :string}
    field :stack_ids, {:array, :string}
  end

  @valid ~w(notes service_ids stack_ids)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:vertices, with: &vertex_changeset/2)
    |> cast_embed(:edges, with: &edge_changeset/2)
  end

  defp vertex_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(identifier type description)a)
    |> validate_required(~w(identifier type description)a)
  end

  defp edge_changeset(model, attrs) do
    model
    |> cast(attrs, ~w(from to type description)a)
    |> validate_required(~w(from to)a)
  end

  @json_schema Console.priv_file!("tools/agent/update_graph.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("update_graph")
  def description(), do: "Updates the knowledge graph with the provided vertices, edges, notes, service ids, and stack ids"

  def implement(%__MODULE__{} = model) do
    with {:ok, json} <- Console.mapify(model) |> Jason.encode(),
         {:ok, graph} <- Poison.decode(json, as: Graph.spec()),
         _ <- Graph.update(graph),
      do: Graph.encode()
  end
end
