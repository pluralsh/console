defmodule Console.AI.Research.Graph do
  defmodule Vertex do
    @derive JSON.Encoder
    defstruct [:identifier, :type, :description, annotations: %{}]
  end

  defmodule Edge do
    @derive JSON.Encoder
    defstruct [:from, :to, :type, :description]
  end

  defstruct [vertices: %{}, edges: %{}, notes: [], service_ids: [], stack_ids: []]

  def spec() do
    %__MODULE__{vertices: [%Vertex{}], edges: [%Edge{}]}
  end

  @key __MODULE__

  def new(), do: store(%__MODULE__{})

  def encode!() do
    g = fetch()

    JSON.encode!(%{
      vertices: Map.values(g.vertices),
      edges: Map.values(g.edges),
      notes: g.notes,
      service_ids: Enum.uniq(g.service_ids),
      stack_ids: Enum.uniq(g.stack_ids)
    })
  end

  def update(%__MODULE__{vertices: vertices, edges: edges, notes: notes} = graph) do
    fetch()
    |> add_edges(edges)
    |> add_vertices(vertices)
    |> then(fn g -> put_in(g.notes, g.notes ++ notes) end)
    |> then(fn g -> put_in(g.service_ids, g.service_ids ++ graph.service_ids) end)
    |> then(fn g -> put_in(g.stack_ids, g.stack_ids ++ graph.stack_ids) end)
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
