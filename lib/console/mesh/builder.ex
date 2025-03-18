defmodule Console.Mesh.Builder do
  @moduledoc """
  Convenience module for building a mesh graph within the context of a reduce function,
  namely for cases where multiple metrics results need to be merged with partial data.
  """
  alias Console.Mesh.{Edge}

  @type t :: %__MODULE__{
    workloads: %{binary => Workload.t()},
    edges: %{binary => Edge.t()}
  }

  defstruct [workloads: %{}, edges: %{}]

  @spec new() :: t
  def new(), do: %__MODULE__{}

  @spec add(t, Edge.t()) :: t
  def add(%__MODULE__{workloads: w, edges: e} = b, %Edge{from: f, to: t} = edge) do
    w = add_workloads(w, [f, t])
    e = add_edge(e, edge)
    %{b | workloads: w, edges: e}
  end

  @spec render(t) :: [Edge.t()]
  def render(%__MODULE__{workloads: w, edges: e}) do
    Map.values(e)
    |> Enum.map(fn %Edge{from: f, to: t} = e -> %{e | from: w[f.id], to: w[t.id]} end)
  end

  defp merge(nil, w), do: w
  defp merge(%{} = l, %{} = r) do
    Map.from_struct(r)
    |> Enum.reduce(l, fn
      {:__struct__, _}, acc -> acc
      {k, v}, acc when not is_nil(v) -> Map.put(acc, k, v)
      _, acc -> acc
    end)
  end

  defp add_workloads(w, ws) when is_list(ws) do
    Enum.reduce(ws, w, fn workload, w ->
      Map.put(w, workload.id, merge(w[workload.id], workload))
    end)
  end

  defp add_edge(e, %Edge{id: id, statistics: stats} = edge) do
    case Map.get(e, id) do
      nil -> Map.put(e, id, edge)
      %Edge{statistics: s} -> put_in(e[id].statistics, merge(s, stats))
    end
  end
end
