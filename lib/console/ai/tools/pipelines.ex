defmodule Console.AI.Tools.Pipelines do
  use Ecto.Schema
  import Ecto.Changeset
  import Console.AI.Tools.Utils
  alias Console.Repo
  alias Console.Schema.{Flow, Pipeline, StageService}

  embedded_schema do
    field :query, :string
  end

  @valid ~w(query)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
  end

  @json_schema Console.priv_file!("tools/pipelines.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("pipelines")
  def description(), do: "Shows the pipelines currently associated with this flow. This can be a source of truth for the stage of the Plural service deployments in the flow as well."

  def implement(%__MODULE__{} = query) do
    for_flow(fn %Flow{id: flow_id} ->
      Pipeline.for_flow(flow_id)
      |> Repo.all()
      |> Repo.preload([:project, stages: [services: [service: :cluster]], edges: [:from, :to, :gates]])
      |> Enum.filter(&maybe_search(&1, query))
      |> model()
      |> Jason.encode()
    end)
  end

  defp maybe_search(%Pipeline{name: n}, %__MODULE__{query: q}) when is_binary(q),
    do: String.contains?(n, q)
  defp maybe_search(_, _), do: true

  defp model(pipelines) do
    Enum.map(pipelines, fn pipeline -> %{
      name: pipeline.name,
      url: Console.url("/cd/pipelines/#{pipeline.id}"),
      project: pipeline.project.name,
      stages: stages(pipeline.stages),
      edges: edges(pipeline.edges)
    } end)
  end

  defp stages(stages) do
    Enum.map(stages, fn stage -> %{
      name: stage.name,
      services: Enum.map(stage.services, fn %StageService{service: svc} -> %{
        plural_service_deployment: svc.name,
        cluster: svc.cluster.handle,
        url: Console.url("/cd/clusters/#{svc.cluster_id}/services/#{svc.id}/components"),
        status: svc.status,
      } end)
    } end)
  end

  defp edges(edges) do
    Enum.map(edges, fn edge -> %{
      from_stage: edge.from.name,
      to_stage: edge.to.name,
      gates: Enum.map(edge.gates, fn gate -> %{
        name: gate.name,
        type: gate.type,
        state: gate.state
      } end)
    } end)
  end
end
