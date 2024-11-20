defmodule Console.GraphQl.Resolvers.Deployments.Pipeline do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Pipelines}
  alias Console.Schema.{
    Pipeline,
    PipelineGate,
    PipelineContext,
    PipelineContextHistory
  }

  def list_pipelines(args, %{context: %{current_user: user}}) do
    Pipeline.for_user(user)
    |> Pipeline.ordered()
    |> pipeline_filters(args)
    |> maybe_search(Pipeline, args)
    |> paginate(args)
  end

  def cluster_gates(_, %{context: %{cluster: cluster}}), do: {:ok, Pipelines.for_cluster(cluster)}

  def paged_cluster_gates(args, %{context: %{cluster: %{id: id}}}) do
    PipelineGate.for_cluster(id)
    |> PipelineGate.for_agent()
    |> PipelineGate.pending()
    |> paginate(args)
  end

  def pipeline_contexts(%{id: id}, args, _) do
    PipelineContext.for_pipeline(id)
    |> PipelineContext.ordered()
    |> paginate(args)
  end

  def pipeline_context_history(%{id: id}, args, _) do
    PipelineContextHistory.for_stage(id)
    |> PipelineContextHistory.ordered()
    |> paginate(args)
  end

  def cluster_gate(%{id: id}, ctx) do
    Pipelines.get_gate!(id)
    |> allow(actor(ctx), :read)
  end

  def resolve_pipeline(%{id: id}, %{context: %{current_user: user}}) do
    Pipelines.get_pipeline!(id)
    |> allow(user, :read)
  end

  def resolve_gate(%{id: id}, %{context: %{current_user: user}}) do
    Pipelines.get_gate!(id)
    |> allow(user, :read)
  end

  def resolve_pipeline_context(%{id: id}, %{context: %{current_user: user}}) do
    Pipelines.get_context!(id)
    |> allow(user, :read)
  end

  def upsert_pipeline(%{name: name, attributes: attrs}, %{context: %{current_user: user}}),
    do: Pipelines.upsert(attrs, name, user)

  def delete_pipeline(%{id: id}, %{context: %{current_user: user}}),
    do: Pipelines.delete(id, user)

  def approve_gate(%{id: id}, %{context: %{current_user: user}}),
    do: Pipelines.approve_gate(id, user)

  def force_gate(%{id: id} = args, %{context: %{current_user: user}}),
    do: Pipelines.force_gate(args[:state] || :open, id, user)

  def update_gate(%{id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Pipelines.update_gate(attrs, id, cluster)

  def create_pipeline_context(%{pipeline_id: pipe_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Pipelines.create_pipeline_context(attrs, pipe_id, user)

  defp pipeline_filters(query, args) do
    Enum.reduce(args, query, fn
      {:project_id, id}, q -> Pipeline.for_project(q, id)
      _, q -> q
    end)
  end
end
