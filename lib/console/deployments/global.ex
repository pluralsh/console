defmodule Console.Deployments.Global do
  use Console.Services.Base
  import Console.Deployments.Policies
  import Console, only: [clean: 1]
  alias Console.PubSub
  alias Console.Deployments.Services
  alias Console.Services.Users
  alias Console.Schema.{
    GlobalService,
    Service,
    Cluster,
    User,
    Tag,
    ManagedNamespace,
    NamespaceInstance,
    ServiceTemplate,
    ServiceDependency,
    Revision
  }
  require Logger

  @type global_resp :: {:ok, GlobalService.t} | Console.error
  @type namespace_resp :: {:ok, ManagedNamespace.t} | Console.error

  def get!(id), do: Repo.get!(GlobalService, id)

  def get_namespace!(id), do: Repo.get!(ManagedNamespace, id)

  @doc """
  Creates a new global service and defers syncing clusters through the pubsub broadcaster
  """
  @spec create(map, binary | nil, User.t) :: global_resp
  def create(attrs, service_id, %User{} = user) do
    start_transaction()
    |> add_operation(:global, fn _ ->
      %GlobalService{service_id: service_id}
      |> GlobalService.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:insert)
    end)
    |> add_operation(:rev, fn %{global: global} ->
      Repo.preload(global, template: :dependencies)
      |> Map.get(:template)
      |> ensure_revision(get_in(attrs, [:template, :configuration]))
    end)
    |> execute(extract: :global)
    |> when_ok(&Repo.preload(&1, [template: :dependencies], force: true))
    |> notify(:create, user)
  end

  def create(attrs, %User{} = user), do: create(attrs, nil, user)


  @doc """
  Updates a global service by id
  """
  def update(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:global, fn _ ->
      get!(id)
      |> Repo.preload(template: :dependencies)
      |> GlobalService.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:rev, fn %{global: global} ->
      Repo.preload(global, template: :dependencies)
      |> Map.get(:template)
      |> ensure_revision(get_in(attrs, [:template, :configuration]))
    end)
    |> execute(extract: :global)
    |> when_ok(&Repo.preload(&1, [template: :dependencies], force: true))
    |> notify(:update, user)
  end

  @doc """
  Deletes a global service and delinks any created services
  """
  @spec delete(binary, User.t) :: global_resp
  def delete(global_id, %User{} = user) do
    start_transaction()
    |> add_operation(:global, fn _ ->
      get!(global_id)
      |> allow(user, :write)
    end)
    |> add_operation(:cascade, fn
      %{global: %GlobalService{cascade: %GlobalService.Cascade{delete: true}}} ->
        Service.for_owner(global_id)
        |> Repo.update_all(set: [deleted_at: Timex.now()])
        |> ok()
      %{global: %GlobalService{cascade: %GlobalService.Cascade{detach: true}}} ->
        Service.for_owner(global_id)
        |> Repo.delete_all()
        |> ok()
      %{global: _} ->
        Service.for_owner(global_id)
        |> Repo.update_all(set: [owner_id: nil])
        |> ok()
    end)
    |> add_operation(:delete, fn %{global: global} -> Repo.delete(global) end)
    |> execute(extract: :global)
    |> notify(:delete, user)
  end

  @doc """
  Creates a managed namespace instance and notifies along
  """
  @spec create_managed_namespace(map, User.t) :: namespace_resp
  def create_managed_namespace(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:ns, fn _ ->
      %ManagedNamespace{}
      |> ManagedNamespace.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:insert)
    end)
    |> add_operation(:rev, fn %{ns: ns} ->
      Repo.preload(ns, [service: :dependencies])
      |> Map.get(:service)
      |> ensure_revision(get_in(attrs, [:service, :configuration]))
    end)
    |> execute(extract: :ns)
    |> when_ok(&Repo.preload(&1, [service: :dependencies], force: true))
    |> notify(:create, user)
  end

  @doc """
  Updates a managed namespace instance
  """
  @spec update_managed_namespace(map, binary, User.t) :: namespace_resp
  def update_managed_namespace(attrs, namespace_id, %User{} = user) do
    start_transaction()
    |> add_operation(:ns, fn _ ->
      get_namespace!(namespace_id)
      |> Repo.preload([service: :dependencies])
      |> ManagedNamespace.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:rev, fn %{ns: ns} ->
      Repo.preload(ns, [service: :dependencies])
      |> Map.get(:service)
      |> ensure_revision(get_in(attrs, [:service, :configuration]))
    end)
    |> execute(extract: :ns)
    |> when_ok(&Repo.preload(&1, [service: :dependencies], force: true))
    |> notify(:update, user)
  end

  @doc """
  Soft-Deletes a managed namespace instance and schedules full deletion for when all instances have
  been deleted
  """
  @spec delete_managed_namespace(binary, User.t) :: namespace_resp
  def delete_managed_namespace(namespace_id, %User{} = user) do
    get_namespace!(namespace_id)
    |> Ecto.Changeset.change(%{deleted_at: Timex.now()})
    |> allow(user, :delete)
    |> when_ok(:update)
    |> notify(:delete, user)
  end

  @doc """
  Determines if a global service is eligible for this cluster
  """
  @spec match?(GlobalService.t | ManagedNamespace.t, Cluster.t) :: boolean
  def match?(%GlobalService{} = global, %Cluster{} = cluster) do
    Enum.all?([
      {:field, global.distro, cluster.distro},
      {:field, global.provider_id, cluster.provider_id},
      {:tags, global.tags, cluster.tags},
    ], &matcher/1)
  end

  def match?(%ManagedNamespace{target: nil}, _), do: true
  def match?(%ManagedNamespace{target: %{} = target}, %Cluster{} = cluster) do
    Enum.all?([
      {:field, target.distro, cluster.distro},
      {:tags, target.tags, cluster.tags},
    ], &matcher/1)
  end

  defp matcher({:field, nil, _}), do: true
  defp matcher({:field, v, v}), do: true
  defp matcher({:field, _, _}), do: false
  defp matcher({:tags, %{} = tags, t2}) do
    Enum.map(tags, fn {k, v} -> %{name: k,  value: v} end)
    |> matches_tags?(t2)
  end
  defp matcher({:tags, t1, t2}), do: matches_tags?(t1, t2)

  @doc """
  Clones the global service directly into the target cluster
  """
  @spec add_to_cluster(GlobalService.t, Cluster.t) :: Services.service_resp
  def add_to_cluster(global, cluster), do: add_to_cluster(global, cluster, bot())

  @spec add_to_cluster(GlobalService.t, Cluster.t, User.t) :: Services.service_resp
  def add_to_cluster(%GlobalService{id: gid, template: %ServiceTemplate{} = tpl}, %Cluster{id: id}, user) do
    ServiceTemplate.attributes(tpl)
    |> Map.put(:owner_id, gid)
    |> Map.put(:dependences, svc_deps(tpl.dependencies, []))
    |> Services.create_service(id, user)
  end

  def add_to_cluster(%GlobalService{id: gid, service_id: sid}, %Cluster{id: cid}, user),
    do: Services.clone_service(%{owner_id: gid}, sid, cid, user)

  @doc """
  Ensures a managed namespace is synchronized across all target clusters
  """
  def reconcile_namespace(%ManagedNamespace{} = ns) do
    ns = Repo.preload(ns, [:clusters, service: :dependencies])
         |> load_configuration()
    bot = bot()

    Cluster.target(ns.target || %{})
    |> Cluster.or_ids(Enum.map(ns.clusters, & &1.id))
    |> Cluster.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(&sync_namespace(&1, ns, bot))
    |> Stream.run()
  end

  @doc """
  Ensures the service associated with the given managed namespace has been properly synchronized
  """
  @spec sync_namespace(Cluster.t, ManagedNamespace.t) :: Services.service_resp | :ok
  def sync_namespace(%Cluster{} = cluster, %ManagedNamespace{} = ns, user \\ nil) do
    user = user || bot()
    with %NamespaceInstance{} = ni <- Repo.get_by(NamespaceInstance, cluster_id: cluster.id, namespace_id: ns.id),
         %{service: %Service{} = service} <- Repo.preload(ni, [service: [:context_bindings, :dependencies]]),
         {:diff, true} <- {:diff, diff?(ns.service, service)} do
      namespace_service_attrs(ns, service.dependencies)
      |> Map.delete(:name)
      |> Services.update_service(service.id, user)
    else
      nil -> create_namespace_instance(ns, cluster, user)
      {:diff, _} -> Logger.info "No differences found for namespace #{ns.name}[#{ns.id}] on cluster #{cluster.handle}"
    end
  end

  defp create_namespace_instance(%ManagedNamespace{service: %{}} = ns, %Cluster{id: cid} = cluster, %User{} = user) do
    %{name: name} = attrs = namespace_service_attrs(ns, [])
    start_transaction()
    |> add_operation(:service, fn _ ->
      case Services.get_service_by_name(cid, name) do
        %Service{} = svc -> {:ok, svc}
        _ -> Services.create_service(attrs, cid, user)
      end
    end)
    |> add_operation(:instance, fn %{service: svc} ->
      case Repo.get_by(NamespaceInstance, cluster_id: cid, service_id: svc.id) do
        %NamespaceInstance{} = ni -> ni
        _ -> %NamespaceInstance{}
      end
      |> NamespaceInstance.changeset(%{
        service_id: svc.id,
        cluster_id: cluster.id,
        namespace_id: ns.id
      })
      |> Repo.insert_or_update()
    end)
    |> execute(extract: :service)
  end
  defp create_namespace_instance(ns, _, _), do: Logger.info "Namespace #{ns.name}[#{ns.id}] does not specify a service"

  defp namespace_service_attrs(%ManagedNamespace{service: %{} = tpl} = ns, deps) do
    ServiceTemplate.attributes(tpl, ns.name, "#{ns.name}-core")
    |> Map.put(:dependencies, svc_deps(tpl.dependencies, deps))
    |> Map.put(:sync_config, %{create_namespace: false})
  end

  @doc """
  Will either hard delete a managed namespace with no remaining instances or begin deleting its
  associated services
  """
  def drain_managed_namespace(%ManagedNamespace{id: id, deleted_at: d} = ns) when not is_nil(d) do
    NamespaceInstance.for_namespace(id)
    |> Repo.exists?()
    |> case do
      true -> do_drain(ns)
      false -> Repo.delete(ns)
    end
  end
  def drain_managed_namespace(_), do: :ok

  defp do_drain(%ManagedNamespace{id: id}) do
    bot = bot()
    NamespaceInstance.for_namespace(id)
    |> NamespaceInstance.undeleted()
    |> NamespaceInstance.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(&Services.delete_service(&1.service_id, bot))
    |> Stream.run()
  end

  @doc """
  Adds the given global service to all target clusters
  """
  @spec sync_clusters(GlobalService.t) :: :ok
  def sync_clusters(%GlobalService{id: gid} = global) do
    %{service: svc} = global = Repo.preload(global, [template: :dependencies, service: [:context_bindings, :dependencies]])
    global = load_configuration(global)
    bot = bot()
    Cluster.ignore_ids(if not is_nil(svc), do: [svc.cluster_id], else: [])
    |> Cluster.target(global)
    |> Repo.all()
    |> Enum.each(fn %{id: cluster_id} = cluster ->
      case {global, Services.get_service_by_name(cluster_id, svc_name(global))} do
        {_, %Service{owner_id: ^gid} = dest} -> sync_service(global, dest, bot)
        {%GlobalService{reparent: true}, %Service{} = dest} -> sync_service(global, dest, bot)
        {_, %Service{}} -> :ok # ignore if the service was created out of band
        {_, nil} -> add_to_cluster(global, cluster, bot)
      end
    end)
  end

  defp svc_name(%GlobalService{service: %Service{name: name}}), do: name
  defp svc_name(%GlobalService{template: %ServiceTemplate{name: name}}), do: name

  defp bot(), do: %{Users.get_bot!("console") | roles: %{admin: true}}

  @doc """
  it can resync a service owned by a global service
  """
  @spec sync_service(GlobalService.t | Service.t, Service.t, User.t) :: Services.service_resp | :ok
  def sync_service(%GlobalService{template: %ServiceTemplate{} = tpl, id: id}, %Service{} = dest, %User{} = user) do
    Logger.info "Attempting to resync service #{dest.id}"
    dest = Repo.preload(dest, [:context_bindings, :dependencies])
    tpl = Repo.preload(tpl, [:dependencies])
    case diff?(tpl, dest) do
      true -> ServiceTemplate.attributes(tpl)
              |> Map.put(:dependencies, svc_deps(tpl.dependencies, dest.dependencies))
              |> Map.put(:owner_id, id)
              |> Services.update_service(dest.id, user)
      false -> Logger.info "did not update service due to no differences"
    end
  end

  def sync_service(%GlobalService{service: %Service{} = source, id: id}, %Service{} = dest, %User{} = user),
    do: sync_service(source, %{dest | owner_id: id}, user)

  def sync_service(%Service{} = source, %Service{owner_id: owner_id} = dest, %User{} = user) do
    Logger.info "attempting to resync service #{dest.id}"
    source = Repo.preload(source, [:context_bindings, :dependencies])
    dest = Repo.preload(dest, [:context_bindings, :dependencies])
    with {:ok, source_secrets} <- Services.configuration(source),
         {:ok, dest_secrets} <- Services.configuration(dest),
         {:diff, true} <- {:diff, diff?(source, dest, source_secrets, dest_secrets)} do
      Services.update_service(%{
        templated: source.templated,
        namespace: source.namespace,
        owner_id: owner_id,
        configuration: Enum.map(Map.merge(dest_secrets, source_secrets), fn {k, v} -> %{name: k, value: v} end),
        repository_id: source.repository_id,
        sync_config: clean(source.sync_config),
        git: clean(source.git),
        helm: clean(source.helm),
        kustomize: clean(source.kustomize),
        dependencies: svc_deps(source.dependencies, dest.dependencies)
      }, dest.id, user)
    else
      err -> Logger.info "did not sync service due to: #{inspect(err)}"
    end
  end

  @doc """
  Fetches associated secure configuration of a service template
  """
  @spec configuration(ServiceTemplate.t) :: {:ok, map} | Console.error
  def configuration(%ServiceTemplate{revision_id: id}) when is_binary(id),
    do: secret_store().fetch(id)
  def configuration(_), do: {:ok, %{}}

  def load_configuration(%GlobalService{template: %ServiceTemplate{} = tpl} = global) do
    tpl = ServiceTemplate.load_configuration(tpl)
    put_in(global.template, tpl)
  end

  def load_configuration(%ManagedNamespace{service: %ServiceTemplate{} = tpl} = ns) do
    tpl = ServiceTemplate.load_configuration(tpl)
    put_in(ns.service, tpl)
  end

  def load_configuration(pass), do: pass

  @doc """
  Determines if services are different enough to merit resyncing
  """
  @spec diff?(Service.t | ManagedNamespace.t | ServiceTemplate.t, Service.t) :: boolean | {:error, term}
  def diff?(%ManagedNamespace{service: %ServiceTemplate{} = template}, %Service{} = dest),
    do: diff?(template, dest)

  def diff?(%ServiceTemplate{} = spec, %Service{} = dest) do
    spec = Repo.preload(spec, [:dependencies])
    dest = Repo.preload(dest, [:dependencies])
    with {:ok, source_secrets} <- configuration(spec),
         {:ok, dest_secrets} <- Services.configuration(dest),
      do: (spec.repository_id != dest.repository_id || spec.templated != dest.templated ||
            specs_different?(spec, dest) || !contexts_equal?(spec, dest) || !deps_equal?(spec, dest) ||
            missing_source?(source_secrets, dest_secrets))
  end

  def diff?(%Service{} = source, %Service{} = dest) do
    source = Repo.preload(source, [:dependencies])
    dest = Repo.preload(dest, [:dependencies])
    with {:ok, source_secrets} <- Services.configuration(source),
         {:ok, dest_secrets} <- Services.configuration(dest),
      do: diff?(source, dest, source_secrets, dest_secrets)
  end

  def diff?(_, _), do: false

  defp diff?(%Service{} = s, %Service{} = d, source, dest) do
    missing_source?(source, dest) || !deps_equal?(s, d) || specs_different?(s, d) || s.repository_id != d.repository_id || s.namespace != d.namespace || s.templated != d.templated
  end

  defp ensure_revision(%ServiceTemplate{} = template, config) do
    start_transaction()
    |> add_operation(:revision, fn _ ->
      case Repo.preload(template, [:revision]) do
        %Revision{} = rev -> {:ok, rev}
        _ -> Repo.insert(%Revision{template_id: template.id, version: "0.1.0"})
      end
    end)
    |> add_operation(:update, fn %{revision: %{id: id}} ->
      ServiceTemplate.changeset(template, %{revision_id: id})
      |> Repo.update()
    end)
    |> add_operation(:secrets, fn %{revision: %{id: id}} ->
      secrets = Enum.into(config || [], %{}, & {&1.name, &1.value})
      secret_store().store(id, secrets)
    end)
    |> execute(extract: :update)
  end
  defp ensure_revision(nil, _), do: {:ok, %{}}

  defp secret_store(), do: Console.conf(:secret_store)

  defp matches_tags?([], _), do: true
  defp matches_tags?(tags, other_tags) do
    dest = Tag.as_map(other_tags)
    Tag.as_map(tags)
    |> Enum.all?(fn {k, v} -> dest[k] == v end)
  end

  defp missing_source?(source, dest) do
    Enum.any?(source, fn {k, v} -> dest[k] != v end)
  end

  defp contexts_equal?(%ServiceTemplate{contexts: ctxs}, svc) do
    MapSet.new(svc.context_bindings || [], & &1.context_id)
    |> MapSet.equal?(MapSet.new(ctxs || []))
  end

  defp deps_equal?(%{dependencies: deps}, svc) do
    MapSet.new(svc.dependencies || [], & &1.name)
    |> MapSet.equal?(MapSet.new(deps || [], & &1.name))
  end

  @spec svc_deps([ServiceDependency.t], [ServiceDependency.t]) :: [ServiceDependency.t]
  defp svc_deps(dependencies, existing) do
    existing_by_name = Map.new(existing, & {&1.name, &1})
    Enum.map(dependencies, fn dep ->
      case Map.get(existing_by_name, dep.name) do
        %ServiceDependency{status: s} -> %{name: dep.name, status: s}
        _ -> %{name: dep.name}
      end
    end)
  end

  defp specs_different?(source, dest) do
    Enum.any?(~w(helm git kustomize sync_config)a, fn key ->
      s = Map.get(source, key)
      d = Map.get(dest, key)
      clean(s) != clean(d)
    end)
  end

  def notify({:ok, %GlobalService{} = svc}, :create, user),
    do: handle_notify(PubSub.GlobalServiceCreated, svc, actor: user)
  def notify({:ok, %GlobalService{} = svc}, :update, user),
    do: handle_notify(PubSub.GlobalServiceUpdated, svc, actor: user)
  def notify({:ok, %GlobalService{} = svc}, :delete, user),
    do: handle_notify(PubSub.GlobalServiceDeleted, svc, actor: user)

  def notify({:ok, %ManagedNamespace{} = svc}, :create, user),
    do: handle_notify(PubSub.ManagedNamespaceCreated, svc, actor: user)
  def notify({:ok, %ManagedNamespace{} = svc}, :update, user),
    do: handle_notify(PubSub.ManagedNamespaceUpdated, svc, actor: user)
  def notify({:ok, %ManagedNamespace{} = svc}, :delete, user),
    do: handle_notify(PubSub.ManagedNamespaceDeleted, svc, actor: user)

  def notify(pass, _, _), do: pass
end
