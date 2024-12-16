defmodule Console.GraphQl.Resolvers.Deployments.Service do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Services, Clusters, Tree}
  alias Console.Schema.{
    Service,
    Revision
  }

  def resolve_service(%{cluster: _, name: _} = args, ctx) do
    fetch_service(args)
    |> allow(actor(ctx), :read)
  end
  def resolve_service(%{id: id}, ctx) do
    Services.get_service!(id)
    |> allow(actor(ctx), :read)
  end

  def resolve_service_context(%{name: name}, %{context: %{current_user: user}}) do
    Services.get_context_by_name(name)
    |> allow(user, :read)
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

  def service_tree(args, %{context: %{current_user: user}}) do
    Service.for_user(user)
    |> service_filters(args)
    |> Service.tree()
    |> paginate(args)
  end

  def services_for_owner(%{id: id}, args, %{context: %{current_user: user}}) do
    Service.for_user(user)
    |> Service.for_owner(id)
    |> service_filters(args)
    |> maybe_search(Service, args)
    |> Service.ordered()
    |> paginate(args)
  end

  def services_for_namespace(%{id: id}, args, %{context: %{current_user: user}}) do
    Service.for_user(user)
    |> Service.for_namespace(id)
    |> service_filters(args)
    |> maybe_search(Service, args)
    |> Service.ordered()
    |> paginate(args)
  end

  def list_revisions(%{id: id}, args, _) do
    Revision.for_service(id)
    |> Revision.ordered(:ui)
    |> paginate(args)
  end

  def cluster_services(_, %{context: %{cluster: %{id: id}}}) do
    Service.for_cluster(id)
    |> Service.ordered()
    |> all()
  end

  def paged_cluster_services(args, %{context: %{cluster: %{id: id}}}) do
    Service.for_cluster(id)
    |> Service.ordered()
    |> paginate(args)
  end

  def tree(%{id: id}, %{context: %{current_user: user}}) do
    component = Services.get_service_component!(id) |> Console.Repo.preload([service: :cluster])
    with {:ok, _} <- allow(component.service, user, :read),
         %Kazan.Server{} = server <- Clusters.control_plane(component.service.cluster),
         _ <- Kube.Utils.save_kubeconfig(server),
         {:ok, {results, edges}} <- Tree.tree(component),
      do: {:ok, Map.put(results, :edges, edges) |> filter_secrets(component.service, user)}
  end

  defp filter_secrets(results, svc, user) do
    case allow(svc, user, :write) do
      {:ok, _} -> results
      _ -> Map.put(results, :secrets, [])
    end
  end

  def service_configuration(service, _, ctx) do
    with {:ok, _} <- allow(service, actor(ctx), :secrets),
         {:ok, secrets} <- Services.configuration(service) do
      {:ok, Enum.map(secrets, fn {k, v} -> %{name: k, value: v} end)}
    end
  end

  def allow_secrets(svc, result, ctx) do
    with {:ok, _} <- allow(svc, actor(ctx), :secrets),
      do: {:ok, result}
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

  def detach_service(%{cluster: _, name: _} = args, %{context: %{current_user: user}}) do
    svc = fetch_service(args)
    Services.detach_service(svc.id, user)
  end
  def detach_service(%{id: id}, %{context: %{current_user: user}}),
    do: Services.detach_service(id, user)

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

  def kick_service(%{cluster: c, name: n} = args, %{context: %{current_user: user}})
    when is_binary(c) and is_binary(n) do
    svc = fetch_service(args)
    Services.kick(svc.id, user)
  end
  def kick_service(%{service_id: id}, %{context: %{current_user: user}}),
    do: Services.kick(id, user)

  def update_service_components(%{id: id} = args, %{context: %{cluster: cluster}}) do
    Map.take(args, ~w(errors components sha revision_id)a)
    |> Services.update_components(id, cluster)
  end

  def merge_service(%{id: id, configuration: config}, %{context: %{current_user: user}}),
    do: Services.merge_service(config, id, user)

  def save_service_context(%{attributes: attrs, name: name}, %{context: %{current_user: user}}),
    do: Services.save_context(attrs, name, user)

  def delete_service_context(%{id: id}, %{context: %{current_user: user}}),
    do: Services.delete_context(id, user)

  def tarball(svc, _, _), do: {:ok, Services.tarball(svc)}
  def docs(svc, _, _), do: Services.docs(svc)

  def fetch_manifests(%{id: id}, %{context: %{current_user: user}}),
    do: Services.fetch_manifests(id, user)

  def request_manifests(%{id: id}, %{context: %{current_user: user}}),
    do: Services.request_manifests(id, user)

  def save_manifests(%{id: id, manifests: mans}, %{context: %{cluster: cluster}}) do
    with :ok <- Services.save_manifests(mans, id, cluster),
      do: {:ok, true}
  end

  defp service_filters(query, args) do
    Enum.reduce(args, query, fn
      {:cluster_id, id}, q -> Service.for_cluster(q, id)
      {:cluster, handle}, q -> Service.for_cluster_handle(q, handle)
      {:status, status}, q -> Service.for_status(q, status)
      {:errored, true}, q -> Service.errored(q)
      {:project_id, id}, q -> Service.for_project(q, id)
      _, q -> q
    end)
  end
end
