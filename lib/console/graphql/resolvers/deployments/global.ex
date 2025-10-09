defmodule Console.GraphQl.Resolvers.Deployments.Global do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Global
  alias Console.Schema.{GlobalService, ManagedNamespace}

  def resolve_managed_namespace(%{id: id}, ctx) when is_binary(id) do
    Global.get_namespace!(id)
    |> allow(actor(ctx), :read)
  end

  def resolve_managed_namespace(%{name: name}, ctx) when is_binary(name) do
    Global.get_namespace_by_name!(name)
    |> allow(actor(ctx), :read)
  end

  def resolve_global(%{id: id}, %{context: %{current_user: user}}) do
    Global.get!(id)
    |> allow(user, :read)
  end

  def list_global_services(args, %{context: %{current_user: user}}) do
    GlobalService.ordered()
    |> GlobalService.for_user(user)
    |> apply_filters(GlobalService, args)
    |> maybe_search(GlobalService, args)
    |> paginate(args)
  end

  def list_managed_namespaces(args, _) do
    ManagedNamespace.ordered()
    |> apply_filters(ManagedNamespace, args)
    |> paginate(args)
  end

  def managed_namespaces_for_cluster(args, %{context: %{cluster: cluster}}) do
    ManagedNamespace.for_cluster(cluster)
    |> paginate(args)
  end

  def template_configuration(template, _, ctx) do
    with {:ok, _} <- allow(template, actor(ctx), :write),
         {:ok, secrets} <- Global.configuration(template) do
      {:ok, Enum.map(secrets, fn {k, v} -> %{name: k, value: v} end)}
    end
  end

  def create_global_service(%{cluster: _, name: _, attributes: attrs} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Global.create(attrs, svc.id, user)
  end
  def create_global_service(%{service_id: sid, attributes: attrs}, %{context: %{current_user: user}}),
    do: Global.create(attrs, sid, user)
  def create_global_service(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Global.create(attrs, user)

  def update_global_service(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Global.update(attrs, id, user)

  def delete_global_service(%{id: id}, %{context: %{current_user: user}}),
    do: Global.delete(id, user)

  def create_managed_namespace(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Global.create_managed_namespace(attrs, user)

  def update_managed_namespace(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Global.update_managed_namespace(attrs, id, user)

  def delete_managed_namespace(%{id: id}, %{context: %{current_user: user}}),
    do: Global.delete_managed_namespace(id, user)

  def sync_global_service(%{id: id}, %{context: %{current_user: user}}) do
    Global.get!(id)
    |> Global.sync(user)
  end

  defp apply_filters(query, schema, args) do
    Enum.reduce(args, query, fn
      {:project_id, id}, q when is_binary(id) -> schema.for_project(q, id)
      _, q -> q
    end)
  end
end
