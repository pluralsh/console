defmodule Console.Deployments.Services do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.PubSub
  alias Console.Schema.{Service, Revision, User, Cluster, ClusterProvider, ApiDeprecation}
  alias Console.Deployments.{Secrets.Store, Git, Clusters, Deprecations.Table}

  @type service_resp :: {:ok, Service.t} | Console.error
  @type revision_resp :: {:ok, Revision.t} | Console.error

  def get_service!(id), do: Console.Repo.get!(Service, id)

  def get_service(id), do: Console.Repo.get(Service, id)

  def get_revision!(id), do: Repo.get!(Revision, id)

  def tarball(%Service{id: id}), do: Console.url("/v1/git/tarballs?id=#{id}")

  def referenced?(id) do
    Enum.map([Cluster.for_service(id), ClusterProvider.for_service(id)], &Console.Repo.exists?/1)
    |> Enum.any?(& &1)
  end

  @doc """
  Creates a new service in a cluster, alongside an initial revision for the service
  """
  @spec create_service(map, binary, User.t) :: service_resp
  def create_service(attrs, cluster_id, %User{} = user) do
    start_transaction()
    |> add_operation(:check, fn _ ->
      Clusters.get_cluster(cluster_id)
      |> allow(user, :write)
    end)
    |> add_operation(:base, fn _ ->
      %Service{cluster_id: cluster_id}
      |> Service.changeset(add_version(attrs, "0.0.1"))
      |> Console.Repo.insert()
    end)
    |> add_operation(:revision, fn %{base: base} -> create_revision(add_version(attrs, "0.0.1"), base) end)
    |> add_revision()
    |> execute(extract: :service)
    |> notify(:create, user)
  end

  @doc """
  modifies rbac settings for this service
  """
  @spec rbac(map, binary, User.t) :: service_resp
  def rbac(attrs, service_id, %User{} = user) do
    get_service!(service_id)
    |> Service.rbac_changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  def operator_service(deploy_token, cluster_id, %User{} = user) do
    repo = Git.deploy_repo!()
    create_service(%{
      repository_id: repo.id,
      name: "deploy-operator",
      namespace: "plrl-deploy-operator",
      git: %{ref: "main", folder: "helm"},
      configuration: [
        %{name: "deploy-token", value: deploy_token},
        %{name: "url", value: Path.join(Console.conf(:ext_url), "ext")}
      ]
    }, cluster_id, user)
  end

  @spec authorized(binary, Cluster.t) :: service_resp
  def authorized(%Service{cluster_id: id} = svc, %Cluster{id: id}), do: {:ok, svc}
  def authorized(service_id, %Cluster{} = cluster) when is_binary(service_id) do
    get_service(service_id)
    |> authorized(cluster)
  end
  def authorized(_, _), do: {:error, "could not find service in cluster"}

  @doc """
  Updates a service and creates a new revision
  """
  @spec update_service(map, binary, User.t) :: service_resp
  def update_service(attrs, service_id, %User{} = user) do
    start_transaction()
    |> add_operation(:check, fn _ ->
      get_service!(service_id)
      |> allow(user, :write)
    end)
    |> add_operation(:update, fn %{check: svc} -> update_service(attrs, svc) end)
    |> execute(extract: :update)
    |> notify(:update, user)
  end

  @doc """
  Updates the sha of a service if relevant
  """
  @spec update_sha(Service.t, binary) :: service_resp
  def update_sha(%Service{sha: sha} = svc, sha), do: {:ok, svc}
  def update_sha(%Service{id: id}, sha) do
    update_service(%{sha: sha}, id)
    |> notify(:update)
  end

  def update_service(attrs, svc_id) when is_binary(svc_id),
    do: update_service(attrs, get_service!(svc_id))
  def update_service(attrs, %Service{} = svc) do
    start_transaction()
    |> add_operation(:base, fn _ ->
      Service.changeset(svc, attrs)
      |> Console.Repo.update()
    end)
    |> add_operation(:revision, fn %{base: base} ->
      add_version(attrs, base.version)
      |> Console.dedupe(:git, Map.take(base.git, ~w(ref folder)a))
      |> Console.dedupe(:configuration, fn ->
        {:ok, secrets} = configuration(base)
        Enum.map(secrets, fn {k, v} -> %{name: k, value: v} end)
      end)
      |> create_revision(base)
    end)
    |> add_revision()
    |> execute(extract: :service)
  end

  defp add_version(attrs, vsn), do: Console.dedupe(attrs, :version, vsn)

  @doc """
  Rollbacks a service to a given revision id, all configuration will then be fetched via that revision
  and modify the sha/git pointers as well.
  """
  @spec rollback(binary, binary, User.t) :: service_resp
  def rollback(revision_id, service_id, %User{} = user) do
    start_transaction()
    |> add_operation(:service, fn _ ->
      get_service!(service_id)
      |> allow(user, :write)
    end)
    |> add_operation(:revision, fn %{service: %{id: id}} ->
      case get_revision!(revision_id) do
        %Revision{service_id: ^id} = r -> {:ok, r}
        _ -> {:error, "revision does not belong to this service"}
      end
    end)
    |> add_operation(:update, fn %{service: svc, revision: rev} ->
      svc
      |> Service.rollback_changeset(%{revision_id: rev.id, sha: rev.sha, git: Map.take(rev.git, [:ref, :folder])})
      |> Repo.update()
    end)
    |> execute(extract: :update)
    |> notify(:update, user)
  end

  @doc """
  Updates the list of service components, separate operation to avoid creating a no-op revision
  """
  @spec update_components(map, binary | Service.t) :: service_resp
  def update_components(attrs, %Service{} = service) do
    start_transaction()
    |> add_operation(:service, fn _ ->
      service
      |> Console.Repo.preload([:components])
      |> Service.changeset(attrs)
      |> Console.Repo.update()
    end)
    |> add_operation(:deprecations, fn %{service: svc} -> add_deprecations(svc) end)
    |> execute(extract: :service)
    |> notify(:components)
  end
  def update_components(attrs, service_id) when is_binary(service_id),
    do: update_components(attrs, get_service!(service_id))

  @spec update_components([map], binary, Cluster.t) :: service_resp
  def update_components(components, service_id, %Cluster{} = cluster) do
    with {:ok, svc} <- authorized(service_id, cluster),
      do: update_components(%{components: components}, svc)
  end

  @doc """
  Find and insert any deprecations for this service's components
  """
  @spec add_deprecations(Service.t) :: {:ok, map} | Console.error
  def add_deprecations(%Service{} = service) do
    %{components: components} = Repo.preload(service, [:components])
    Enum.reduce(components, start_transaction(), fn component, xact ->
      case Table.fetch(component) do
        %Table.Entry{} = entry ->
          add_operation(xact, component.id, fn _ ->
            %ApiDeprecation{component_id: component.id}
            |> ApiDeprecation.changeset(Map.from_struct(entry))
            |> Repo.insert()
          end)
        _ -> xact
      end
    end)
    |> execute()
  end

  @doc """
  Schedules a service to be cleaned up and ultimately deleted
  """
  @spec delete_service(binary, User.t) :: service_resp
  def delete_service(service_id, %User{} = user) do
    get_service!(service_id)
    |> Ecto.Changeset.change(%{deleted_at: Timex.now()})
    |> allow(user, :delete)
    |> when_ok(:update)
    |> notify(:delete, user)
  end

  @doc """
  permissionless service delete for internal usage
  """
  @spec delete_service(binary) :: service_resp
  def delete_service(service_id) do
    get_service!(service_id)
    |> Ecto.Changeset.change(%{deleted_at: Timex.now()})
    |> Console.Repo.update()
    |> notify(:delete)
  end

  @doc """
  Permanently removes a service from the db along w/ all secrets
  """
  @spec hard_delete(Service.t) :: service_resp
  def hard_delete(%Service{} = svc) do
    Console.Repo.delete(svc)
    |> notify(:hard_delete)
  end

  @doc """
  Fetches a service's configuration from the configured store
  """
  @spec configuration(Service.t) :: Store.secrets_resp
  def configuration(%Service{revision_id: nil}), do: {:ok, %{}}
  def configuration(%Service{revision_id: revision_id}), do: secret_store().fetch(revision_id)

  @doc """
  fetches all revisions of a service
  """
  @spec revisions(Service.t) :: [Revision.t]
  def revisions(%Service{id: id}, limit \\ :none) do
    Revision.for_service(id)
    |> Revision.ordered()
    |> add_limit(limit)
    |> Console.Repo.all()
  end

  defp add_limit(q, :none), do: q
  defp add_limit(q, limit) when is_integer(limit), do: Revision.limit(q, limit)

  @doc """
  Prunes expired revisions for a service, and guarantees current revision remains (even if older)
  """
  @spec prune_revisions(Service.t) :: {:ok, integer}
  def prune_revisions(%Service{revision_id: rid} = service) do
    to_keep = revisions(service, Console.conf(:revision_history_limit))
    to_keep = MapSet.new([rid | Enum.map(to_keep, & &1.id)])
              |> MapSet.to_list()

    Revision.ignore_ids(to_keep)
    |> Repo.delete_all()
    |> elem(0)
    |> ok()
  end

  defp create_revision(attrs, %Service{id: id}) do
    start_transaction()
    |> add_operation(:revision, fn _ ->
      %Revision{service_id: id}
      |> Revision.changeset(attrs)
      |> Console.Repo.insert()
    end)
    |> add_operation(:secrets, fn %{revision: %{id: id}} ->
      secrets = Enum.into(attrs[:secrets] || [], %{}, & {&1.name, &1.value})
      secret_store().store(id, secrets)
    end)
    |> execute(extract: :revision)
  end

  defp add_revision(xact) do
    add_operation(xact, :service, fn %{revision: %{id: id}, base: service} ->
      Ecto.Changeset.change(service, %{revision_id: id})
      |> Console.Repo.update()
    end)
  end

  defp secret_store(), do: Console.conf(:secret_store)

  defp notify({:ok, %Service{} = svc}, :create, user),
    do: handle_notify(PubSub.ServiceCreated, svc, actor: user)
  defp notify({:ok, %Service{} = svc}, :update, user),
    do: handle_notify(PubSub.ServiceUpdated, svc, actor: user)
  defp notify({:ok, %Service{} = svc}, :delete, user),
    do: handle_notify(PubSub.ServiceDeleted, svc, actor: user)
  defp notify(pass, _, _), do: pass

  defp notify({:ok, %Service{} = svc}, :components),
    do: handle_notify(PubSub.ServiceComponentsUpdated, svc)
  defp notify({:ok, %Service{} = svc}, :update),
    do: handle_notify(PubSub.ServiceUpdated, svc)
  defp notify({:ok, %Service{} = svc}, :hard_delete),
    do: handle_notify(PubSub.ServiceHardDeleted, svc)
  defp notify(pass, _), do: pass
end
