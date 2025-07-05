defmodule Console.AI.Tools.Clusters do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Repo
  alias Console.Schema.{Flow, Cluster}

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/clusters.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("clusters")
  def description(), do: "Shows the clusters currently being deployed into this flow"

  def implement(%__MODULE__{query: q}) do
    for_flow(fn %Flow{id: flow_id} ->
      Cluster.for_flow(flow_id)
      |> Repo.all()
      |> Repo.preload([:tags, :project])
      |> postprocess(q)
    end)
  end

  def postprocess(clusters, q) when is_list(clusters) and (is_binary(q) or is_nil(q)) do
    clusters
    |> Enum.filter(&maybe_search(&1, q))
    |> model()
    |> Jason.encode()
  end

  defp maybe_search(%Cluster{name: n, tags: ts}, q) when is_binary(q) do
    (
      String.contains?(n, q) ||
      Enum.any?((ts || []), & String.contains?(&1.value, q) || String.contains?(&1.name, q))
    )
  end
  defp maybe_search(_, _), do: true

  defp model(clusters) do
    Enum.map(clusters, fn cluster -> %{
      name: cluster.name,
      handle: cluster.handle,
      kubernetes_distribution: cluster.distro,
      tags: Enum.map(cluster.tags, fn tag -> %{name: tag.name, value: tag.value} end),
      project: cluster.project.name,
    } end)
  end
end
