defmodule Console.GraphQl.Resolvers.Deployments.Service do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Services, Clusters}
  alias Console.Schema.{
    Service,
    Revision
  }

  def resolve_service(%{cluster: _, name: _} = args, ctx) do
    fetch_service(args)
    |> allow(actor(ctx), :name)
  end
  def resolve_service(%{id: id}, ctx) do
    Services.get_service!(id)
    |> allow(actor(ctx), :read)
  end

  def service_statuses(args, %{context: %{current_user: user}}) do
    Service.for_user(user)
    |> service_filters(args)
    |> maybe_search(Service, args)
    |> Service.statuses()
    |> Console.Repo.all()
    |> ok()
  end

  def list_services(args, %{context: %{current_user: user}}) do
    Service.for_user(user)
    |> service_filters(args)
    |> maybe_search(Service, args)
    |> Service.ordered()
    |> paginate(args)
  end

  def list_revisions(%{id: id}, args, _) do
    Revision.for_service(id)
    |> Revision.ordered()
    |> paginate(args)
  end

  def cluster_services(_, %{context: %{cluster: %{id: id}}}) do
    Service.for_cluster(id)
    |> Service.ordered()
    |> all()
  end

  def service_configuration(service, _, ctx) do
    with {:ok, _} <- allow(service, actor(ctx), :secrets),
         {:ok, secrets} <- Services.configuration(service) do
      {:ok, Enum.map(secrets, fn {k, v} -> %{name: k, value: v} end)}
    end
  end

  def helm_values(%{parent: service} = helm, _, ctx) do
    case allow(service, actor(ctx), :secrets) do
      {:ok, _} -> {:ok, helm.values}
      err -> err
    end
  end

  def create_service(%{attributes: attrs, cluster: cluster}, %{context: %{current_user: user}}) when is_binary(cluster) do
    cluster = Clusters.find!(cluster)
    Services.create_service(attrs, cluster.id, user)
  end
  def create_service(%{attributes: attrs, cluster_id: id}, %{context: %{current_user: user}}),
    do: Services.create_service(attrs, id, user)

  def update_service(%{attributes: attrs, cluster: _, name: _} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Services.update_service(attrs, svc.id, user)
  end
  def update_service(%{attributes: attrs, id: id}, %{context: %{current_user: user}}),
    do: Services.update_service(attrs, id, user)

  def delete_service(%{cluster: _, name: _} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Services.delete_service(svc.id, user)
  end
  def delete_service(%{id: id}, %{context: %{current_user: user}}),
    do: Services.delete_service(id, user)

  def proceed(args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Services.proceed(args[:promotion] || :proceed, svc, user)
  end

  def clone_service(%{cluster: _, name: _, cluster_id: cid, attributes: attrs} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Services.clone_service(attrs, svc.id, cid, user)
  end
  def clone_service(%{service_id: sid, cluster_id: cid, attributes: attrs}, %{context: %{current_user: user}}),
    do: Services.clone_service(attrs, sid, cid, user)

  def rollback(%{cluster: _, name: _, revision_id: rev} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Services.rollback(rev, svc.id, user)
  end
  def rollback(%{id: id, revision_id: rev}, %{context: %{current_user: user}}),
    do: Services.rollback(rev, id, user)

  def update_service_components(%{id: id} = args, %{context: %{cluster: cluster}}),
    do: Services.update_components(Map.take(args, [:errors, :components]), id, cluster)

  def merge_service(%{id: id, configuration: config}, %{context: %{current_user: user}}),
    do: Services.merge_service(config, id, user)

  def tarball(svc, _, _), do: {:ok, Services.tarball(svc)}
  def docs(svc, _, _), do: Services.docs(svc)

  defp service_filters(query, args) do
    Enum.reduce(args, query, fn
      {:cluster_id, id}, q -> Service.for_cluster(q, id)
      {:cluster, handle}, q -> Service.for_cluster_handle(q, handle)
      {:status, status}, q -> Service.for_status(q, status)
      _, q -> q
    end)
  end
end
