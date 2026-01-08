defmodule Console.AI.Research.Graph do
  defmodule Vertex do
    @derive JSON.Encoder
    @derive Jason.Encoder
    defstruct [:identifier, :type, :description, annotations: %{}]
  end

  defmodule Edge do
    @derive JSON.Encoder
    @derive Jason.Encoder
    defstruct [:from, :to, :type, :description]
  end

  alias Console.Schema.InfraResearch

  @derive JSON.Encoder
  @derive Jason.Encoder
  defstruct [vertices: %{}, edges: %{}, notes: [], service_ids: [], stack_ids: []]

  def spec() do
    %__MODULE__{vertices: [%Vertex{}], edges: [%Edge{}]}
  end

  @key __MODULE__

  def new(), do: store(%__MODULE__{})

  def encode!(g \\ fetch()), do: JSON.encode!(graph_data(g))
  def encode(g \\ fetch()), do: Jason.encode(graph_data(g))

  def graph_data(%__MODULE__{} = g) do
    %{
      vertices: Map.values(g.vertices),
      edges: Map.values(g.edges),
      notes: g.notes,
      service_ids: Enum.uniq(g.service_ids),
      stack_ids: Enum.uniq(g.stack_ids)
    }
  end

  def convert(%InfraResearch{
    analysis: %InfraResearch.Analysis{
      notes: notes,
      graph: %InfraResearch.Analysis.Graph{vertices: vertices, edges: edges}
    }
  }) do
    %__MODULE__{
      vertices: Map.new(vertices, fn %{identifier: id} = v -> {id, convert(v)} end),
      edges: Map.new(edges, fn %{from: f, to: t} = e -> {"#{f}.#{t}", convert(e)} end),
      notes: notes,
      service_ids: [],
      stack_ids: []
    }
  end
  def convert(%InfraResearch.Analysis.Graph.Vertex{
    identifier: id,
    type: type,
    description: description,
    annotations: annotations
  }) do
    %Vertex{identifier: id, type: type, description: description, annotations: annotations}
  end
  def convert(%InfraResearch.Analysis.Graph.Edge{
    from: f,
    to: t,
    type: type,
    description: description
  }) do
    %Edge{from: f, to: t, type: type, description: description}
  end

  def update(%__MODULE__{vertices: vertices, edges: edges, notes: notes} = graph, base \\ fetch()) do
    base
    |> add_edges(edges)
    |> add_vertices(vertices)
    |> then(fn g ->
      %{
        g | notes: g.notes ++ notes,
            service_ids: Enum.uniq(g.service_ids ++ graph.service_ids),
            stack_ids: Enum.uniq(g.stack_ids ++ graph.stack_ids)
      }
    end)
    |> store()
  end

  def add_edges(%__MODULE__{} = graph, edges) when is_list(edges) do
    Enum.reduce(edges, graph, fn %Edge{from: f, to: t} = e, g ->
      put_in(g.edges["#{f}.#{t}"], e)
    end)
  end
  def add_edges(graph, _), do: graph

  def add_vertices(%__MODULE__{} = graph, vertices) when is_list(vertices) do
    Enum.reduce(vertices, graph, fn %Vertex{identifier: id} = v, g ->
      put_in(g.vertices[id], v)
    end)
  end
  def add_vertices(graph, _), do: graph

  def store(%__MODULE__{} = graph) do
    Process.put(@key, graph)
    graph
  end

  def fetch(), do: Process.get(@key)
end
