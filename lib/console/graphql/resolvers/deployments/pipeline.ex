defmodule Console.GraphQl.Resolvers.Deployments.Pipeline do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Pipelines}
  alias Console.Schema.{Pipeline}

  def list_pipelines(args, %{context: %{current_user: user}}) do
    Pipeline.for_user(user)
    |> Pipeline.ordered()
    |> maybe_search(Pipeline, args)
    |> paginate(args)
  end

  def cluster_gates(_, %{context: %{cluster: cluster}}), do: {:ok, Pipelines.for_cluster(cluster)}

  def resolve_pipeline(%{id: id}, %{context: %{current_user: user}}) do
    Pipelines.get_pipeline!(id)
    |> allow(user, :read)
  end

  def upsert_pipeline(%{name: name, attributes: attrs}, %{context: %{current_user: user}}),
    do: Pipelines.upsert(attrs, name, user)

  def delete_pipeline(%{id: id}, %{context: %{current_user: user}}),
    do: Pipelines.delete(id, user)

  def approve_gate(%{id: id}, %{context: %{current_user: user}}),
    do: Pipelines.approve_gate(id, user)

  def force_gate(%{id: id}, %{context: %{current_user: user}}),
    do: Pipelines.force_gate(id, user)

  def update_gate(%{id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Pipelines.update_gate(attrs, id, cluster)
end
