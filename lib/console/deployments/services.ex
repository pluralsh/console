defmodule Console.Deployments.Services do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  import Console, only: [probe: 2]
  alias Console.Prom.Benchmark
  alias Console.PubSub
  alias Console.Deployments.{
    Secrets.Store,
    Settings,
    Git,
    Clusters,
    Deprecations.Checker,
    AddOns,
    Tar
  }
  alias Console.Schema.{
    Service,
    ServiceComponent,
    Revision,
    User,
    Cluster,
    ClusterProvider,
    ApiDeprecation,
    GitRepository,
    ServiceContext,
    ServiceDependency,
    ServiceComponent,
    ServiceComponentChild
  }
  alias Console.Deployments.Helm
  require Logger

  @cache_adapter Console.conf(:cache_adapter)
  @secrets_ttl :timer.hours(1)

  @type service_resp :: {:ok, Service.t} | Console.error
  @type revision_resp :: {:ok, Revision.t} | Console.error
  @type context_resp :: {:ok, ServiceContext.t} | Console.error

  @spec count_all() :: integer
  def count_all(), do: Repo.aggregate(Service, :count)

  def get_service!(id), do: Console.Repo.get!(Service, id)

  def get_service(id), do: Console.Repo.get(Service, id)

  def get_service_by_name!(cid, name), do: Console.Repo.get_by!(Service, name: name, cluster_id: cid)
  def get_service_by_name(cid, name), do: Console.Repo.get_by(Service, name: name, cluster_id: cid)

  def get_service_by_handle!(handle, name) do
    Service.for_cluster_handle(handle)
    |> Repo.get_by!(name: name)
  end

  def get_service_by_handle(handle, name) do
    Service.for_cluster_handle(handle)
    |> Repo.get_by(name: name)
  end

  def get_revision!(id), do: Repo.get!(Revision, id)

  def get_service_component!(id), do: Repo.get!(ServiceComponent, id)

  def get_context_by_name!(name), do: Console.Repo.get_by!(ServiceContext, name: name)
  def get_context_by_name(name), do: Console.Repo.get_by(ServiceContext, name: name)

  def tarball(%Service{id: id}), do: api_url("v1/git/tarballs?id=#{id}")

  @doc """
  Pushes a request to the relevant agent to gather manifests for a service
  """
  @spec request_manifests(binary, User.t) :: service_resp
  def request_manifests(id, %User{} = user) do
    get_service!(id)
    |> allow(user, :write)
    |> notify(:manifests, user)
  end

  @doc """
  Saves the manifests in cache for 30 minutes to be queried by the ui
  """
  @spec save_manifests([binary], binary | Service.t, Cluster.t) :: :ok | Console.error
  def save_manifests(manifests, %Service{id: id, cluster_id: cid}, %Cluster{id: cid}),
    do: Console.Cache.put({:manifests, id}, manifests, ttl: :timer.minutes(30))
  def save_manifests(_, %Service{}, %Cluster{}),
    do: {:error, "service doesn't belong to this cluster"}
  def save_manifests(manifests, id, %Cluster{} = cluster) when is_binary(id),
    do: save_manifests(manifests, get_service!(id), cluster)

  @doc """
  Fetches the manifests from cache at query time
  """
  @spec fetch_manifests(binary, User.t) :: {:ok, [binary]} | Console.error
  def fetch_manifests(id, %User{} = user) do
    get_service!(id)
    |> allow(user, :write)
    |> when_ok(fn _ ->
      Console.Cache.get({:manifests, id})
      |> ok()
    end)
  end

  @doc """
  Coalesces a single sha to represent if the tarball for a service has changed or not.  Since manifests can be sourced from many
  locations, this can be relatively complex, and also must include details like manual helm values, values files,
  and the specific git subfolder you're fetching from.
  """
  @spec digest(Service.t) :: {:ok, binary} | Console.error
  def digest(%Service{} = svc) do
    Enum.map([
      {:repository, svc.repository_id, svc.git},
      {:git_helm, probe(svc, [:helm, :repository_id]), probe(svc, [:helm, :git])},
      {:flux, probe(svc, [:helm, :repository]), svc},
      {:helm, probe(svc, [:helm, :url]), svc.helm}
    ], &digest_filter(&1, svc))
    |> Enum.map(fn
      {_, id, %Service.Git{} = ref} when is_binary(id) ->
        Git.cached!(id) |> Git.Discovery.digest(ref)
      {:flux, _, svc} ->
        Helm.Charts.digest(svc)
      {:helm, _, %{chart: c, version: v, url: url}} when is_binary(c) and is_binary(v) and is_binary(url) ->
        Helm.Discovery.digest(url, c, v)
      _ -> nil
    end)
    |> Enum.filter(& &1)
    |> Console.all()
    |> case do
      {:ok, digests} -> {:ok, combined_sha([subdigests(svc) | digests])}
      err -> err
    end
  end

  defp digest_filter({_, nil, _}, _), do: false
  defp digest_filter({:repository, _, _} = res, %Service{helm: %Service.Helm{values_files: [_ | _]}}), do: res
  defp digest_filter({:repository, _, _}, %Service{helm: %Service.Helm{url: u}}) when is_binary(u),
    do: false
  defp digest_filter({:repository, _, _}, %Service{helm: %Service.Helm{repository: %{namespace: ns, name: n}}})
    when is_binary(ns) and is_binary(n), do: false
  defp digest_filter(ref, _), do: ref

  defp subdigests(%Service{helm: %Service.Helm{values_files: f, values: v}}) do
    combined_sha((f || []) ++ Enum.filter([v], & &1))
  end
  defp subdigests(_), do: ""

  defp combined_sha(shas) when is_list(shas) do
    Enum.join(shas, "::")
    |> Console.sha()
  end

  @doc """
  Constructs a filestream for the tar artifact of a service, and perhaps performs some JIT modifications
  before sending it upstream to the given client.
  """
  @spec tarstream(Service.t) :: {:ok, SmartFile.t} | Console.error
  def tarstream(%Service{repository_id: id, helm: %Service.Helm{repository_id: rid, chart: c, values_files: [_ | _] = files} = helm} = svc)
      when is_binary(id) and (is_binary(c) or is_binary(rid)) do
    with {:ok, f} <- Git.Discovery.fetch(svc),
         {:ok, contents} <- Tar.tar_stream(f),
         contents = Map.new(contents),
         {:ok, chart} <- tarfile(%{svc | norevise: true}),
         splice <- Map.take(contents, files) |> maybe_values(helm),
      do: Tar.splice(chart, splice)
  end

  def tarstream(%Service{helm: %Service.Helm{values: values}} = svc) when is_binary(values) do
    with {:ok, tar} <- tarfile(svc),
      do: Tar.splice(tar, %{"values.yaml.static" => values})
  end

  def tarstream(%Service{} = svc), do: tarfile(svc)

  defp tarfile(%Service{helm: %Service.Helm{repository_id: id, git: %{} = git}}) when is_binary(id) do
    Git.get_repository!(id)
    |> Git.Discovery.fetch(git)
  end

  defp tarfile(%Service{helm: %Service.Helm{chart: c, version: v, url: url}} = svc)
    when is_binary(c) and is_binary(v) and is_binary(url) do
    with {:ok, f, sha} <- Helm.Discovery.fetch(url, c, v),
         {:ok, _} <- update_sha_without_revision(svc, sha),
      do: {:ok, f}
  end

  defp tarfile(%Service{helm: %Service.Helm{chart: c, version: v}} = svc)
    when is_binary(c) and is_binary(v) do
    with {:ok, f, sha} <- Helm.Charts.artifact(svc),
         {:ok, _} <- update_sha_without_revision(svc, sha),
      do: {:ok, f}
  end
  defp tarfile(%Service{} = svc), do: Git.Discovery.fetch(svc)

  defp maybe_values(files, %Service.Helm{values: vals}) when is_binary(vals),
    do: Map.merge(files, %{"values.yaml.static" => vals})
  defp maybe_values(files, _), do: files

  def referenced?(id) do
    [Cluster.for_service(id), ClusterProvider.for_service(id)]
    |> Enum.map(&Console.Repo.exists?/1)
    |> Enum.any?(& &1)
  end

  def count() do
    Service.nonsystem()
    |> Repo.aggregate(:count, :id)
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
      |> case do
        {:ok, %Cluster{deleted_at: nil} = cluster} -> {:ok, cluster}
        {:ok, _} -> {:error, "cannot create a service in a deleting cluster"}
        err -> err
      end
    end)
    |> add_operation(:base, fn _ ->
      %Service{cluster_id: cluster_id}
      |> Service.changeset(add_version(attrs, "0.0.1"))
      |> Console.Repo.insert()
    end)
    |> add_operation(:check_repo, fn
      %{base: %{helm: %{repository: %{namespace: ns, name: n}}}} ->
        Helm.Repository.get(ns, n)
      _ -> {:ok, true}
    end)
    |> add_operation(:revision, fn %{base: base} -> create_revision(add_version(attrs, "0.0.1"), base) end)
    |> add_revision()
    |> add_operation(:validate, fn %{base: base} -> post_validate(base, user) end)
    |> execute(extract: :service)
    |> notify(:create, user)
  end

  @doc """
  modifies rbac settings for this service
  """
  @spec rbac(map, binary, User.t) :: service_resp
  def rbac(attrs, service_id, %User{} = user) do
    get_service!(service_id)
    |> Repo.preload([:write_bindings, :read_bindings])
    |> allow(user, :write)
    |> when_ok(&Service.rbac_changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  def operator_service(%Cluster{id: cluster_id} = cluster, %User{} = user) do
    repo = Git.deploy_repo!()
    create_service(%{
      repository_id: repo.id,
      protect: true,
      name: "deploy-operator",
      namespace: "plrl-deploy-operator",
      git: %{ref: Settings.agent_ref(), folder: "charts/deployment-operator"},
      helm: (case Settings.agent_helm_values() do
        nil -> nil
        vals when is_binary(vals) -> %{values: vals}
      end),
      configuration: operator_configuration(cluster)
    }, cluster_id, user)
  end

  def update_operator_service(%Cluster{id: id} = cluster, %User{} = user) do
    case get_service_by_name(id, "deploy-operator") do
      %Service{} = svc ->
        merge_service(operator_configuration(cluster), svc.id, user)
      _ -> {:ok, nil}
    end
  end

  defp operator_configuration(%Cluster{id: cluster_id, deploy_token: deploy_token}) do
    [
      %{name: "clusterId", value: cluster_id},
      %{name: "deployToken", value: deploy_token},
      %{name: "url", value: api_url("gql")},
      %{name: "kasAddress", value: Clusters.kas_url()}
    ]
  end

  def write_authorized(%Service{} = svc, %User{} = user), do: allow(svc, user, :write)
  def write_authorized(service_id, actor) when is_binary(service_id) do
    get_service(service_id)
    |> write_authorized(actor)
  end
  def write_authorized(_, _), do: {:error, "could not find service in cluster"}

  @spec authorized(binary, Cluster.t | User.t) :: service_resp
  def authorized(%Service{} = svc, %User{} = user), do: allow(svc, user, :read)
  def authorized(%Service{cluster_id: id} = svc, %Cluster{id: id}), do: {:ok, svc}
  def authorized(service_id, actor) when is_binary(service_id) do
    get_service(service_id)
    |> authorized(actor)
  end
  def authorized(_, _), do: {:error, "could not find service in cluster"}

  def post_validate(%Service{} = service, %User{} = user) do
    case Repo.preload(service, [imports: [:service, :stack]]) do
      %Service{imports: [_ | _] = imports} ->
        Enum.reduce_while(imports, {:ok, service}, fn imp, acc ->
          case allow(imp, user, :write) do
            {:ok, _} -> {:cont, acc}
            _ -> {:halt, {:error, "you cannot edit this service without access to stack #{imp.stack.name}"}}
          end
        end)
      _ -> {:ok, service}
    end
  end

  @doc """
  Determines if all dependencies for a service have been satisfied
  """
  @spec dependencies_ready(Service.t) :: service_resp
  def dependencies_ready(%Service{} = svc) do
    with %{dependencies: [_ | _] = deps} <- Repo.preload(svc, [:dependencies]),
         dep when not is_nil(dep) <- Enum.find(deps, & &1.status != :healthy) do
      {:error, "dependency #{dep.name} is not ready"}
    else
      _ -> {:ok, svc}
    end
  end

  def add_errors(%Service{id: svc_id}, errors) do
    get_service(svc_id)
    |> Repo.preload([:errors])
    |> Service.changeset(mark_failed(%{errors: errors}))
    |> Repo.update()
  end

  defp mark_failed(%{errors: [_ | _]} = attrs), do: Map.put(attrs, :status, :failed)
  defp mark_failed(attrs), do: attrs

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
    |> add_operation(:validate, fn %{update: base} -> post_validate(base, user) end)
    |> execute(extract: :update)
    |> notify(:update, user)
  end

  @doc "Determine if a kubernetes resource matches a component w/in the given service"
  @spec accessible(Service.t, map) :: {:ok, map} | Console.error
  def accessible(%Service{} = svc, k8s_resource) when is_map(k8s_resource) do
    ServiceComponent.for_service(svc.id)
    |> ServiceComponent.for_identifier(Kube.Utils.identifier(k8s_resource))
    |> Repo.exists?()
    |> case do
      true -> {:ok, k8s_resource}
      false -> accessible(svc, Kube.Utils.parent(k8s_resource, Kube.Utils.ns(k8s_resource)))
    end
  end
  def accessible(_, _), do: {:error, "forbidden"}

  @doc """
  It will merge in new configuration for a service (and nothing else)
  """
  @spec merge_service(list, binary, User.t) :: service_resp
  def merge_service(config, service_id, %User{} = user) do
    start_transaction()
    |> add_operation(:source, fn _ ->
      get_service!(service_id)
      |> allow(user, :write)
    end)
    |> add_operation(:config, fn %{source: source} ->
      with {:ok, secrets} <- configuration(source),
        do: {:ok, merge_configuration(secrets, config)}
    end)
    |> add_operation(:update, fn %{source: source, config: config} ->
      update_service(%{configuration: config}, source)
    end)
    |> execute(extract: :update)
    |> notify(:update, user)
  end

  @doc """
  Will copy a service, and apply any user specified attributes on top.

  This will also merge user specified configuration into the services base config (allowing you not to have to specify the full set)
  """
  @spec clone_service(map, binary, binary, User.t) :: service_resp
  def clone_service(attrs \\ %{}, service_id, cluster_id, %User{} = user) do
    start_transaction()
    |> add_operation(:source, fn _ ->
      get_service!(service_id)
      |> Repo.preload([:dependencies, :context_bindings, :imports])
      |> allow(user, :write)
    end)
    |> add_operation(:config, fn %{source: source} ->
      with {:ok, secrets} <- configuration(source),
        do: {:ok, merge_configuration(secrets, attrs[:configuration])}
    end)
    |> add_operation(:create, fn %{source: source, config: config} ->
      Map.take(source, [:repository_id, :sha, :name, :namespace, :templated])
      |> Console.dedupe(:git, Console.mapify(source.git))
      |> Console.dedupe(:helm, Console.mapify(source.helm))
      |> Console.dedupe(:kustomize, Console.mapify(source.kustomize))
      |> Console.dedupe(:imports, Enum.map(source.imports, & %{service_id: &1.service_id, stack_id: &1.stack_id}))
      |> Console.dedupe(:dependencies, Enum.map(source.dependencies, & %{name: &1.name}))
      |> Console.dedupe(:sync_config, Console.clean(source.sync_config))
      |> DeepMerge.deep_merge(attrs)
      |> Map.put(:configuration, config)
      |> create_service(cluster_id, user)
    end)
    |> execute(extract: :create)
    |> notify(:create, user)
  end

  @doc """
  Allows the console to manage its own upgrades, given the original installation values file
  """
  @spec self_manage(binary, User.t) :: service_resp
  def self_manage(values, %User{} = user) do
    start_transaction()
    |> add_operation(:values, fn _ -> YamlElixir.read_from_string(values) end)
    |> add_operation(:git, fn _ -> ensure_console_repo(user) end)
    |> add_operation(:settings, fn _ -> Settings.update(%{self_managed: true}, user) end)
    |> add_operation(:service, fn %{git: git} ->
      cluster = Clusters.local_cluster()
      create_service(%{
        name: "console",
        namespace: "plrl-console",
        repository_id: git.id,
        protect: true,
        git: %{ref: "master", folder: "charts/console"},
        helm: %{values: values},
      }, cluster.id, user)
    end)
    |> execute(extract: :service)
  end

  @spec kick(binary | Service.t, User.t) :: service_resp
  def kick(%Service{} = service, %User{} = user) do
    with {:ok, svc} <- allow(service, user, :write),
         svc <- Repo.preload(svc, [:repository]),
         _ <- Git.Discovery.kick(svc.repository),
      do: notify({:ok, svc}, :update, user)
  end

  def kick(service_id, user) when is_binary(service_id) do
    get_service!(service_id)
    |> kick(user)
  end

  @doc """
  Updates the sha of a service if relevant
  """
  @spec update_sha(Service.t, binary, binary) :: service_resp
  def update_sha(%Service{revision: %Revision{sha: sha}} = svc, sha, _), do: {:ok, svc}
  def update_sha(%Service{id: id}, sha, msg) do
    start_transaction()
    |> add_operation(:base, fn _ ->
      get_service!(id)
      |> Service.changeset(%{sha: sha, status: :stale, message: msg})
      |> Repo.update()
    end)
    |> add_operation(:current, fn %{base: base} ->
      case Repo.preload(base, [:revision]) do
        %{revision: %Revision{} = revision} ->
          Revision.update_changeset(revision, %{sha: sha, message: msg})
          |> Repo.update()
        _ -> {:ok, base}
      end
    end)
    |> add_operation(:revision, fn %{base: base} ->
      add_version(%{sha: sha, message: msg}, base.version)
      |> Console.dedupe(:git, base.git && %{ref: sha, folder: base.git.folder})
      |> Console.dedupe(:helm, Console.mapify(base.helm))
      |> Console.dedupe(:kustomize, Console.mapify(base.kustomize))
      |> Console.dedupe(:configuration, fn ->
        {:ok, secrets} = configuration(base)
        Enum.map(secrets, fn {k, v} -> %{name: k, value: v} end)
      end)
      |> create_revision(base)
    end)
    |> execute(extract: :base)
    |> notify(:update, :ignore)
  end

  defp update_sha_without_revision(%Service{norevise: true} = svc, _), do: {:ok, svc}
  defp update_sha_without_revision(%Service{revision: %Revision{sha: sha}} = svc, sha), do: {:ok, svc}
  defp update_sha_without_revision(%Service{id: id}, sha) do
    start_transaction()
    |> add_operation(:base, fn _ ->
      get_service!(id)
      |> Service.changeset(%{sha: sha})
      |> Repo.update()
    end)
    |> add_operation(:current, fn %{base: base} ->
      case Repo.preload(base, [:revision]) do
        %{revision: %Revision{} = revision} ->
          Revision.update_changeset(revision, %{sha: sha})
          |> Repo.update()
        _ -> {:ok, base}
      end
    end)
    |> execute(extract: :base)
  end

  def update_service(attrs, svc_id) when is_binary(svc_id),
    do: update_service(attrs, get_service!(svc_id))
  def update_service(attrs, %Service{} = svc) do
    start_transaction()
    |> add_operation(:base, fn _ ->
      svc = Repo.preload(svc, [:context_bindings, :dependencies, :read_bindings, :write_bindings, :imports])
      attrs = Map.put(attrs, :status, :stale)
      svc
      |> Service.changeset(stabilize_deps(attrs, svc))
      |> Service.update_changeset()
      |> Console.Repo.update()
    end)
    |> add_operation(:revision, fn %{base: base} ->
      add_version(attrs, base.version)
      |> Console.dedupe(:git, Console.mapify(base.git))
      |> Console.dedupe(:helm, Console.mapify(base.helm))
      |> Console.dedupe(:kustomize, Console.mapify(base.kustomize))
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
  fetches the docs for a given service out of git, and renders them as a list of file path/content pairs
  """
  @spec docs(Service.t) :: [%{path: binary, content: binary}]
  def docs(%Service{repository_id: id} = svc) when is_binary(id) do
    with {:ok, f} <- Git.Discovery.docs(svc),
         {:ok, res} <- AddOns.tar_stream(f) do
      {:ok, Enum.map(res, fn {name, content} -> %{path: name, content: content} end)}
    else
      err ->
        Logger.info "failed to fetch docs tarball: #{inspect(err)}"
        {:ok, []}
    end
  end
  def docs(_), do: {:ok, []}

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
      Service.rollback_changeset(svc, %{
        status: :stale,
        revision_id: rev.id,
        sha: rev.sha,
        git: Console.mapify(rev.git),
        helm: Console.mapify(rev.helm),
        kustomize: Console.mapify(rev.kustomize),
      })
      |> Repo.update()
    end)
    |> execute(extract: :update)
    |> notify(:update, user)
  end

  @doc """
  Marks a service as being able to proceed to the next stage of a canary deployment
  """
  @spec proceed(:proceed | :rollback, Service.t, User.t) :: service_resp
  def proceed(promotion \\ :proceed, %Service{} = service, %User{} = user) do
    service
    |> Ecto.Changeset.change(%{promotion: promotion})
    |> allow(user, :write)
    |> when_ok(:update)
  end

  @doc """
  Determine if a canary can proceed for a service
  """
  @spec proceed?(Service.t) :: boolean
  def proceed?(%Service{promotion: :proceed}), do: true
  def proceed?(_), do: false


  @doc """
  Determine if a canary should be forcibly rolled back
  """
  @spec rollback?(Service.t) :: boolean
  def rollback?(%Service{promotion: :rollback}), do: true
  def rollback?(_), do: false

  def stale_dependencies?(%Service{cluster_id: id, name: name}) do
    ServiceDependency.for_cluster(id)
    |> ServiceDependency.for_name(name)
    |> ServiceDependency.pending()
    |> Repo.exists?()
  end

  def flush_dependencies(%Service{status: :healthy, cluster_id: id, name: name} = svc) do
    if stale_dependencies?(svc) do
      ServiceDependency.for_cluster(id)
      |> ServiceDependency.for_name(name)
      |> ServiceDependency.pending()
      |> Repo.update_all(set: [status: :healthy])
      |> ok()
    else
      {:ok, []}
    end
  end
  def flush_dependencies(_), do: {:ok, :pending}

  @doc """
  Updates the list of service components, separate operation to avoid creating a no-op revision
  """
  @spec update_components(map, binary | Service.t) :: service_resp
  def update_components(attrs, %Service{} = service) do
    Logger.info "updating components for #{service.id}"
    start_transaction()
    |> add_operation(:service, fn _ ->
      svc = Console.Repo.preload(service, [:errors, components: [:content, :children]])

      svc
      |> Service.changeset(stabilize(attrs, svc))
      |> Console.Repo.update()
    end)
    |> add_operation(:deprecations, fn %{service: svc} -> add_deprecations(svc) end)
    |> add_operation(:updated, fn %{service: %Service{components: components} = service} ->
      running = Enum.all?(components, & &1.state == :running || is_nil(&1.state)) && !Enum.empty?(components)
      failed = Enum.any?(components, & &1.state == :failed) || !Enum.empty?(service.errors)
      paused = Enum.any?(components, & &1.state == :paused)
      unsynced = Enum.any?(components, & !&1.synced)
      num_healthy = Enum.count(components, & (&1.state == :running || is_nil(&1.state)) && &1.synced)
      component_status = "#{num_healthy} / #{length(components)}"
      case {failed, paused, running, latest_vsn(service, attrs), unsynced} do
        {true, _, _, _, _}       -> update_status(service, :failed, component_status)
        {_, true, _, _, _}       -> update_status(service, :paused, component_status)
        {_, _, _, _, true}       -> update_status(service, :stale, component_status)
        {_, _, true, true, _}    -> update_status(service, :healthy, component_status)
        _ -> update_status(service, :stale, component_status)
      end
    end)
    |> add_operation(:dependencies, fn %{updated: svc} -> flush_dependencies(svc) end)
    |> execute(extract: :updated)
    |> notify(:components)
  end
  def update_components(attrs, service_id) when is_binary(service_id),
    do: update_components(attrs, get_service!(service_id))

  @spec update_components(map, binary, Cluster.t) :: service_resp
  def update_components(attrs, service_id, %Cluster{} = cluster) do
    with {:ok, svc} <- authorized(service_id, cluster),
      do: update_components(attrs, svc)
  end

  defp latest_vsn(%Service{sha: sha, revision_id: rid}, %{sha: sha, revision_id: rid})
    when is_binary(sha) and is_binary(rid), do: true
  defp latest_vsn(%Service{sha: nil, revision_id: rid}, %{revision_id: rid}), do: true
  defp latest_vsn(_, %{sha: sha, revision_id: rid}) when is_binary(sha) and is_binary(rid), do: false
  defp latest_vsn(%Service{revision_id: rid}, %{revision_id: rid}), do: true
  defp latest_vsn(_, %{revision_id: rid}) when is_binary(rid), do: false
  defp latest_vsn(_, _), do: true

  def stabilize_deps(%{dependencies: deps} = attrs, %Service{dependencies: old_deps}) when is_list(old_deps) do
    by_name = Map.new(old_deps, & {&1.name, &1.status})
    deps = Enum.map(deps, &Map.put(&1, :status, by_name[&1.name]))
    Map.put(attrs, :dependencies, deps)
  end
  def stabilize_deps(attrs, _), do: attrs

  def stabilize(%{components: new_components} = attrs, %{components: components}) do
    components = Map.new(components, fn  comp -> {component_key(comp), comp} end)
    new_components = Enum.map(new_components, &stabilize_component(&1, components))
    Map.put(attrs, :components, new_components)
  end
  def stabilize(attrs, _), do: attrs

  defp stabilize_component(new_component, components) do
    case components[component_key(new_component)] do
      %ServiceComponent{id: id, children: children} ->
        Map.put(new_component, :id, id)
        |> maybe_stabilize_children(children)
      _ -> new_component
    end
  end

  defp maybe_stabilize_children(%{children: [_ | _] = children} = component, old_children) when is_list(old_children) do
    old_children = Map.new(old_children, fn %ServiceComponentChild{id: id, uid: uid} -> {uid, id} end)
    Map.put(component, :children, Enum.map(children, &Map.put(&1, :id, old_children[&1.uid])))
  end
  defp maybe_stabilize_children(component, _), do: component

  defp component_key(%{group: g, version: v, kind: k, namespace: ns, name: n}), do: {nilify(g), v, k, nilify(ns), n}
  defp component_key(_), do: nil

  defp nilify(""), do: nil
  defp nilify(v), do: v

  @doc """
  Find and insert any deprecations for this service's components
  """
  @spec add_deprecations(Service.t) :: {:ok, map} | Console.error
  def add_deprecations(%Service{} = service) do
    %{components: components, cluster: cluster} = Repo.preload(service, [:components, :cluster])
    found_deprecations = Enum.map(components, fn component ->
      case Checker.check(component, cluster) do
        {entry, blocking} ->
          Map.from_struct(entry)
          |> Map.put(:blocking, blocking)
          |> Map.put(:component_id, component.id)
          |> Map.take(ApiDeprecation.fields())
        _ -> nil
      end
    end)
    |> Enum.filter(& &1)

    case {found_deprecations, has_deprecations?(service)} do
      {[_ | _] = deprecations, _} ->
        start_transaction()
        |> add_operation(:wipe, fn _ ->
          ApiDeprecation.for_service(service.id)
          |> ApiDeprecation.without_component(Enum.map(deprecations, & &1[:component_id]))
          |> Repo.delete_all()
          |> ok()
        end)
        |> add_operation(:deps, fn _ ->
          data = Enum.map(deprecations, &timestamped/1)
          Repo.insert_all(
            ApiDeprecation,
            data,
            on_conflict: :replace_all,
            conflict_target: :component_id
          )
          |> ok()
        end)
        |> execute()
      {[], true} ->
        ApiDeprecation.for_service(service.id)
        |> Repo.delete_all()
        |> ok()
      _ -> {:ok, 0}
    end
  end

  @doc """
  Determines whether a service has any discovered api deprecations
  """
  @spec has_deprecations?(Service.t) :: boolean
  def has_deprecations?(%Service{id: id}) do
    ApiDeprecation.for_service(id)
    |> Repo.exists?()
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
  Removes a service immediately from the database and don't bother with attempting a drain from its cluster
  """
  @spec detach_service(binary, User.t) :: service_resp
  def detach_service(service_id, %User{} = user) do
    get_service!(service_id)
    |> allow(user, :delete)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  def force_delete_service(service_id, %User{} = user) do
    get_service!(service_id)
    |> Ecto.Changeset.change(%{deleted_at: Timex.now()})
    |> Repo.update()
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
  @spec configuration(Service.t | Revision.t) :: Store.secrets_resp
  @decorate cacheable(cache: @cache_adapter, key: {:secrets, id}, opts: [ttl: @secrets_ttl])
  def configuration(%Revision{id: id}), do: secret_store().fetch(id)
  def configuration(%Service{revision_id: id}) when is_binary(id), do: secret_store().fetch(id)
  def configuration(%Service{revision_id: id}) when is_nil(id), do: {:ok, %{}}

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
  def prune_revisions(%Service{id: id, revision_id: rid} = service) do
    to_keep = revisions(service, Console.conf(:revision_history_limit))
    to_keep = MapSet.new([rid | Enum.map(to_keep, & &1.id)])
              |> MapSet.to_list()

    Revision.ignore_ids(to_keep)
    |> Revision.for_service(id)
    |> Repo.delete_all()
    |> elem(0)
    |> ok()
  end

  @doc """
  Saves a service context for the given name, will update if its already present
  """
  @spec save_context(map, binary, User.t) :: context_resp
  def save_context(attrs, name, %User{} = user) do
    case get_context_by_name(name) do
      %ServiceContext{} = ctx -> ctx
      nil -> %ServiceContext{name: name}
    end
    |> ServiceContext.changeset(attrs)
    |> allow(user, :create)
    |> when_ok(&Repo.insert_or_update/1)
  end

  @doc """
  Deletes a service context
  """
  @spec delete_context(binary, User.t) :: context_resp
  def delete_context(id, %User{} = user) do
    Repo.get(ServiceContext, id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Upserts a git repository pointing to the main console repo
  """
  @spec ensure_console_repo(User.t) :: service_resp
  def ensure_console_repo(user) do
    url = "https://github.com/pluralsh/console.git"
    case Git.get_by_url(url) do
      %GitRepository{} = git -> {:ok, git}
      _ -> Git.create_repository(%{url: url}, user)
    end
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

  defp update_status(%Service{} = svc, status, component_status) do
    Ecto.Changeset.change(svc, revert_proceed(%{status: status, component_status: component_status}, status))
    |> Repo.update()
  end

  defp revert_proceed(args, :paused), do: args
  defp revert_proceed(args, _), do: Map.put(args, :promotion, :ignore)

  def api_url(path) do
    Path.join([Console.conf(:ext_url), "ext", path])
  end

  def merge_configuration(secrets, [_ | _] = config) do
    Enum.reduce(config, secrets, fn
      %{name: k, value: nil}, acc -> Map.delete(acc, k)
      %{name: k, value: v}, acc -> Map.put(acc, k, v)
    end)
    |> merge_configuration(nil)
  end
  def merge_configuration(secrets, _), do: Enum.map(secrets, fn {k, v} -> %{name: k, value: v} end)

  defp secret_store(), do: Console.conf(:secret_store)

  defp notify({:ok, %Service{} = svc}, :create, user),
    do: handle_notify(PubSub.ServiceCreated, svc, actor: user)
  defp notify({:ok, %Service{} = svc}, :update, user),
    do: handle_notify(PubSub.ServiceUpdated, svc, actor: user)
  defp notify({:ok, %Service{} = svc}, :delete, user),
    do: handle_notify(PubSub.ServiceDeleted, svc, actor: user)
  defp notify({:ok, %Service{} = svc}, :manifests, user),
    do: handle_notify(PubSub.ServiceManifestsRequested, svc, actor: user)
  defp notify(pass, _, _), do: pass

  defp notify({:ok, %Service{} = svc}, :components),
    do: handle_notify(PubSub.ServiceComponentsUpdated, svc)
  defp notify({:ok, %Service{} = svc}, :hard_delete),
    do: handle_notify(PubSub.ServiceHardDeleted, svc)
  defp notify(pass, _), do: pass
end
