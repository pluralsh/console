defmodule Console.Deployments.Clusters do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  alias Console.PubSub
  alias Console.Commands.Tee
  alias Console.Deployments.{Services, Git, Providers.Configuration, Settings}
  alias Console.Deployments.Providers.Versions
  alias Console.Deployments.Compatibilities.{Table, AddOn, Version, CloudAddOns}
  alias Console.Deployments.Ecto.Validations
  alias Console.Services.Users
  alias Kazan.Apis.Core.V1, as: Core
  alias Console.Schema.{
    Cluster,
    User,
    ClusterProvider,
    Service,
    DeployToken,
    ClusterRevision,
    ProviderCredential,
    RuntimeService,
    AgentMigration,
    PinnedCustomResource,
    UpgradeInsight,
    ClusterInsightComponent,
    ClusterUsage,
    ClusterRegistration,
    CloudAddon
  }
  alias Console.Deployments.Compatibilities
  require Logger

  @cache_adapter Console.conf(:cache_adapter)
  @local_adapter Console.conf(:local_cache)
  @node_ttl :timer.hours(6)
  @readme_ttl :timer.hours(2)

  @type cluster_resp :: {:ok, Cluster.t} | Console.error
  @type cluster_provider_resp :: {:ok, ClusterProvider.t} | Console.error
  @type credential_resp :: {:ok, ProviderCredential.t} | Console.error
  @type runtime_service_resp :: {:ok, RuntimeService.t} | Console.error
  @type pinned_resp :: {:ok, PinnedCustomResource.t} | Console.error
  @type reg_resp :: {:ok, ClusterRegistration.t} | Console.error

  @spec count() :: integer
  def count(), do: Repo.aggregate(Cluster, :count)

  @doc """
  True if there's been one cluster that's successfully pinged in the fleet
  """
  @spec installed?() :: boolean
  @decorate cacheable(cache: @cache_adapter, key: :installed, opts: [ttl: :timer.minutes(10)])
  def installed?() do
    Cluster.pinged()
    |> Repo.exists?()
  end

  def find!(identifier) do
    case Uniq.UUID.parse(identifier) do
      {:ok, _} -> get_cluster!(identifier)
      _ -> get_cluster_by_handle!(identifier)
    end
  end

  def get_cluster!(id), do: Console.Repo.get!(Cluster, id)

  def get_provider!(id), do: Console.Repo.get!(ClusterProvider, id)

  def get_cluster(id), do: Console.Repo.get(Cluster, id)

  def get_provider_by_name(name), do: Console.Repo.get_by(ClusterProvider, name: name)

  def get_provider_by_cloud(name), do: Console.Repo.get_by(ClusterProvider, cloud: name)

  def get_cluster_by_handle(handle), do: Console.Repo.get_by(Cluster, handle: handle)

  def get_cluster_by_handle!(handle), do: Console.Repo.get_by!(Cluster, handle: handle)

  def get_cluster_usage!(id), do: Repo.get!(ClusterUsage, id) |> Repo.preload([:cluster])

  def get_cluster_registration!(id), do: Repo.get!(ClusterRegistration, id)
  def get_registration_by_machine_id!(id), do: Repo.get_by!(ClusterRegistration, machine_id: id)

  def get_runtime_service(id) do
    Console.Repo.get(RuntimeService, id)
    |> with_addon()
  end

  def has_cluster?(%ClusterProvider{id: id}), do: has_cluster?(id)
  def has_cluster?(provider_id) do
    Cluster.for_provider(provider_id)
    |> Repo.exists?()
  end

  def accessible_service?(%Cluster{id: id}, %User{} = user) do
    Service.for_cluster(id)
    |> Service.for_user(user)
    |> Repo.exists?()
  end

  def insight_component(id, %User{} = user) do
    Repo.get!(ClusterInsightComponent, id)
    |> Repo.preload([:cluster])
    |> allow(user, :read)
  end

  @doc """
  Downloads the api discovery data for a cluster to be used in dynamic queries
  """
  @spec api_discovery(Cluster.t) :: %{{binary, binary, binary} => binary}
  @decorate cacheable(cache: @local_adapter, key: {:discovery, cluster.id}, opts: [ttl: @node_ttl])
  def api_discovery(%Cluster{} = cluster) do
    control_plane(cluster)
    |> Console.Deployments.Discovery.discovery()
  end

  @spec control_plane(Cluster.t) :: Kazan.Server.t | {:error, term}
  def control_plane(%Cluster{self: true} = cluster) do
    case Console.cloud?() do
      true -> control_plane(%{cluster | self: false})
      _ -> Kazan.Server.in_cluster()
    end
  end
  def control_plane(%Cluster{kubeconfig: %{raw: raw}}), do: Kazan.Server.from_kubeconfig_raw(raw)
  def control_plane(%Cluster{} = cluster), do: control_plane(cluster, Users.console(), %{"cached" => true})

  def control_plane(%Cluster{id: id}, %User{} = user, claims \\ %{}) do
    with {:ok, token, _} <- Console.Guardian.encode_and_sign(user, claims) do
      %Kazan.Server{
        url: kas_proxy_url(),
        auth: %Kazan.Server.TokenAuth{token: "plrl:#{id}:#{token}"},
      }
    end
  end

  @spec kubeconfig(Cluster.t) :: {:ok, binary} | {:error, term}
  def kubeconfig(%Cluster{name: name} = cluster) do
    with ns when is_binary(ns) <- namespace(cluster),
         {:ok, %Core.Secret{data: %{"value" => value}}} <- Kube.Utils.get_secret(ns, "#{name}-kubeconfig"),
      do: Base.decode64(value)
  end

  @doc """
  Fetches the current instance of the cluster CRD for this cluster record
  """
  @spec cluster_crd(Cluster.t) :: {:ok, Kube.Cluster.t} | Console.error
  def cluster_crd(%Cluster{name: name} = cluster) do
    case namespace(cluster) do
      ns when is_binary(ns) -> {:ok, Console.Cached.Cluster.get(ns, name)}
      nil -> {:ok, nil}
    end
  end

  def warm(:nodes, %Cluster{id: id} = cluster) do
    with {:ok, nodes} <- fetch_nodes(cluster),
      do: @cache_adapter.put({:nodes, id}, {:ok, nodes}, ttl: @node_ttl)
  end

  def warm(:node_metrics, %Cluster{id: id} = cluster) do
    with {:ok, metrics} <- fetch_node_metrics(cluster),
      do: @cache_adapter.put({:node_metrics, id}, {:ok, metrics}, ttl: @node_ttl)
  end

  def warm(:cluster_metrics, %Cluster{id: id} = cluster) do
    with {:ok, metrics} <- fetch_cluster_metrics(cluster),
      do: @local_adapter.put({:cluster_metrics, id}, {:ok, metrics}, ttl: @node_ttl)
  end

  def warm(:api_discovery, %Cluster{} = cluster), do: api_discovery(cluster)

  @doc """
  Same as `nodes/1` except only reads from cache
  """
  @spec cached_nodes(Cluster.t) :: {:ok, term} | Console.error
  def cached_nodes(%Cluster{id: id}) do
    case @local_adapter.get({:nodes, id}) do
      {:ok, nodes} when is_list(nodes) -> {:ok, nodes}
      _ -> {:ok, []}
    end
  end

  @doc """
  Fetches the nodes for a cluster, this query is heavily cached for performance
  """
  @spec nodes(Cluster.t) :: {:ok, term} | Console.error
  @decorate cacheable(cache: @local_adapter, key: {:nodes, cluster.id}, opts: [ttl: @node_ttl])
  def nodes(%Cluster{} = cluster), do: fetch_nodes(cluster)

  defp fetch_nodes(%Cluster{pinged_at: nil, self: false}), do: {:ok, []}
  defp fetch_nodes(%Cluster{} = cluster) do
    query = Core.list_node!(limit: 100)
    with %Kazan.Server{} = server <- control_plane(cluster),
         _ <- Kube.Utils.save_kubeconfig(server),
         {:ok, %{items: items}} <- Kube.Utils.run(query) do
      {:ok, items}
    else
      _ -> {:ok, []}
    end
  end


  def cached_node_metrics(%Cluster{id: id}) do
    case @local_adapter.get({:node_metrics, id}) do
      {:ok, nodes} when is_list(nodes) -> {:ok, nodes}
      _ -> {:ok, []}
    end
  end

  @doc """
  Fetches the node metrics for a cluster, this query is heavily cached for performance
  """
  @spec node_metrics(Cluster.t) :: {:ok, term} | Console.error
  @decorate cacheable(cache: @local_adapter, key: {:node_metrics, cluster.id}, opts: [ttl: @node_ttl])
  def node_metrics(%Cluster{} = cluster), do: fetch_node_metrics(cluster)

  defp fetch_node_metrics(%Cluster{pinged_at: nil, self: false}), do: {:ok, []}
  defp fetch_node_metrics(%Cluster{} = cluster) do
    with %Kazan.Server{} = server <- control_plane(cluster),
         _ <- Kube.Utils.save_kubeconfig(server),
         {:ok, %{items: items}} <- Kube.Client.list_metrics(%{"limit" => "100"}) do
      {:ok, items}
    else
      _ -> {:ok, []}
    end
  end

  @spec cached_cluster_metrics(Cluster.t) :: {:ok, term} | Console.error
  def cached_cluster_metrics(%Cluster{id: id}), do: @local_adapter.get({:cluster_metrics, id})

  @doc """
  Fetches the node metrics for a cluster, this query is heavily cached for performance
  """
  @spec cluster_metrics(Cluster.t) :: {:ok, term} | Console.error
  @decorate cacheable(cache: @local_adapter, key: {:cluster_metrics, cluster.id}, opts: [ttl: @node_ttl])
  def cluster_metrics(%Cluster{} = cluster), do: fetch_cluster_metrics(cluster)

  defp fetch_cluster_metrics(%Cluster{pinged_at: nil, self: false}), do: {:ok, nil}
  defp fetch_cluster_metrics(%Cluster{} = cluster) do
    with %Kazan.Server{} = server <- control_plane(cluster),
         _ <- Kube.Utils.save_kubeconfig(server) do
      Kube.Client.get_metrics_aggregate("global")
    else
      _ -> {:ok, nil}
    end
  end

  @doc """
  the duration for the node cache to live
  """
  @spec node_ttl() :: integer
  def node_ttl(), do: @node_ttl

  @doc """
  removes all cache entries for this cluster
  """
  @spec flush_cache(Cluster.t) :: :ok
  def flush_cache(%Cluster{id: id}) do
    @local_adapter.delete({:node_metrics, id})
    @local_adapter.delete({:nodes, id})
  end

  @doc """
  Refreshes the kubeconfig cache for all clusters matching a given ns/name pair
  """
  @spec refresh_kubeconfig(binary, binary) :: :ok
  def refresh_kubeconfig(ns, name) do
    Cluster.for_namespace(ns)
    |> Cluster.for_name(name)
    |> Repo.all()
    |> Enum.each(&__MODULE__.refresh_kubeconfig/1) # call on self module to allow for mocking
  end

  @doc """
  Regenerates and caches kubeconfig for a cluster
  """
  @spec refresh_kubeconfig(Cluster.t) :: term
  def refresh_kubeconfig(%Cluster{id: id} = cluster) do
    @cache_adapter.delete({:control_plane, id})
    control_plane(cluster)
  end

  @doc """
  Installs the operator on this cluster using the plural cd command
  """
  @spec install(Cluster.t) :: cluster_resp
  def install(%Cluster{id: id, deploy_token: token, self: true} = cluster) do
    url = Console.graphql_endpoint()
    with {:ok, _} <- Console.Commands.Plural.install_cd(url, token) do
      get_cluster(id)
      |> Repo.preload([:service_errors])
      |> Cluster.changeset(%{installed: true, service_errors: []})
      |> Repo.update()
    else
      {:error, out} = err ->
        add_errors(cluster, [%{source: "bootstrap", message: Tee.output(out)}])
        err
      pass ->
        Logger.info "could not install operator to cluster: #{inspect(pass)}"
        {:error, :unready}
    end
  end

  def install(%Cluster{id: id, deploy_token: token} = cluster) do
    url = Services.api_url("gql")
    cluster = Repo.preload(cluster, [:provider, :credential])
    with {:ok, %Kube.Cluster{status: %Kube.Cluster.Status{control_plane_ready: true}}} <- cluster_crd(cluster),
         {:ok, kubeconfig} <- kubeconfig(cluster),
         {:ok, _} <- Console.Commands.Plural.install_cd(url, token, kubeconfig) do
      get_cluster(id)
      |> Repo.preload([:service_errors])
      |> Cluster.changeset(%{installed: true, service_errors: []})
      |> Repo.update()
    else
      {:error, out} = err ->
        add_errors(cluster, [%{source: "bootstrap", message: Tee.output(out)}])
        err
      pass ->
        Logger.info "could not install operator to cluster: #{inspect(pass)}"
        {:error, :unready}
    end
  end

  @doc """
  checks if a user can access a given cluster
  """
  @spec authorized(binary, Cluster.t | User.t) :: cluster_resp
  def authorized(%Cluster{} = cluster, %User{} = user), do: allow(cluster, user, :read)
  def authorized(cluster_id, actor) when is_binary(cluster_id) do
    get_cluster(cluster_id)
    |> Repo.preload([:provider, :credential])
    |> authorized(actor)
  end
  def authorized(_, _), do: {:error, "could not find cluster"}

  @doc """
  Get the namespace this cluster will reside in
  """
  @spec namespace(Cluster.t) :: binary | nil
  def namespace(%Cluster{} = cluster) do
    case Repo.preload(cluster, [:provider, :credential]) do
      %Cluster{credential: %ProviderCredential{namespace: ns}} -> ns
      %Cluster{provider: %ClusterProvider{namespace: ns}} -> ns
      _ -> nil
    end
  end

  def revisions(%Cluster{id: id}) do
    ClusterRevision.for_cluster(id)
    |> ClusterRevision.ordered()
    |> Repo.all()
  end

  def get_by_deploy_token(token) do
    with nil <- Repo.get_by(Cluster, deploy_token: token),
         %DeployToken{cluster: cluster} <- Repo.get_by(DeployToken, token: token) |> Repo.preload([:cluster]),
      do: cluster
  end

  def local_cluster(), do: Console.Repo.get_by!(Cluster, self: true)

  def services(%Cluster{id: id}) do
    Service.for_cluster(id)
    |> Console.Repo.all()
  end

  def draining?(%Cluster{id: id}) do
    Service.for_cluster(id)
    |> Service.drainable()
    |> Console.Repo.exists?()
  end

  @doc """
  creates a new cluster and a service alongside to deploy the cluster via CAPI
  """
  @spec create_cluster(map, User.t) :: cluster_resp
  def create_cluster(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:cloud, fn _ -> {:ok, Console.cloud?()} end)
    |> add_operation(:cluster, fn _ ->
      %Cluster{}
      |> Cluster.changeset(Settings.add_project_id(attrs, user))
      |> allow(user, :create)
      |> when_ok(:insert)
    end)
    |> add_revision()
    |> validate_version()
    |> add_operation(:controller, fn
      %{cluster: %Cluster{self: true} = cluster, cloud: true} ->
        controller_service(cluster)
      _ -> {:ok, %{}}
    end)
    |> add_operation(:service, fn %{cluster: cluster} ->
      Services.operator_service(cluster, tmp_admin(user))
    end)
    |> add_operation(:cluster_service, fn %{cluster: cluster} ->
      case Console.Repo.preload(cluster, [:provider, :credential]) do
        %{self: true} -> {:ok, cluster}
        %{provider: %ClusterProvider{}} = cluster -> cluster_service(cluster, tmp_admin(user))
        _ -> {:ok, cluster}
      end
    end)
    |> add_operation(:rewire, fn
      %{cluster_service: %Cluster{} = cluster} ->
        cluster = Repo.preload(cluster, [:write_bindings])
        Cluster.changeset(cluster, %{
          write_bindings: add_binding(cluster.write_bindings, :user_id, user.id)
        })
        |> Repo.update()
      %{cluster_service: %Service{id: id}, cluster: cluster} ->
        cluster = Repo.preload(cluster, [:write_bindings])
        Cluster.changeset(cluster, %{
          service_id: id,
          write_bindings: add_binding(cluster.write_bindings, :user_id, user.id)
        })
        |> Repo.update()
    end)
    |> execute(extract: :rewire)
    |> when_ok(& %{&1 | token_readable: true})
    |> notify(:create, user)
  end

  @doc """
  Either creates or updates a virtual cluster parented by another cluster.  This will inherit:
  * the project of the cluster
  * bindings of the cluster
  """
  @spec upsert_virtual_cluster(map, binary, User.t) :: cluster_resp
  def upsert_virtual_cluster(attrs, parent_id, %User{} = user) do
    start_transaction()
    |> add_operation(:parent, fn _ ->
      get_cluster!(parent_id)
      |> Repo.preload([:read_bindings, :write_bindings])
      |> allow(user, :write)
    end)
    |> add_operation(:prior, fn _ ->
      infer_handle(attrs)
      |> get_cluster_by_handle()
      |> ok()
    end)
    |> add_operation(:cluster, fn
      %{
        prior: %Cluster{parent_cluster_id: id, virtual: true} = prior,
        parent: %Cluster{id: id}
      } ->
        Cluster.changeset(prior, attrs)
        |> Repo.update()
      %{prior: nil, parent: %Cluster{project_id: proj_id} = parent} ->
        %Cluster{project_id: proj_id, virtual: true, parent_cluster_id: parent_id}
        |> Cluster.changeset(merge_bindings(attrs, parent, ~w(read_bindings write_bindings)a))
        |> Repo.insert()
      %{prior: %{handle: handle}} ->
        {:error, "cluster #{handle} already exists, and is not a virtual cluster within this parent cluster"}
    end)
    |> add_operation(:agent, fn
      %{prior: nil, cluster: cluster} ->
        Services.operator_service(cluster, tmp_admin(user))
      _ -> {:ok, nil}
    end)
    |> execute()
    |> case do
      {:ok, %{prior: %{}, cluster: cluster}} -> notify({:ok, %{cluster | token_readable: true}}, :update, user)
      {:ok, %{prior: nil, cluster: cluster}} -> notify({:ok, %{cluster | token_readable: true}}, :create, user)
      err -> err
    end
  end

  defp infer_handle(%{handle: handle}) when is_binary(handle), do: handle
  defp infer_handle(%{name: name}), do: name

  @doc """
  It will update cluster settings
  """
  @spec update_cluster(map, binary, User.t) :: cluster_resp
  def update_cluster(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:auth, fn _ ->
      get_cluster!(id)
      |> allow(user, :write)
    end)
    |> add_operation(:cluster, fn %{auth: auth} ->
      auth
      |> Console.Repo.preload([:node_pools, :service, :tags, :read_bindings, :write_bindings])
      |> Cluster.changeset(attrs)
      |> Repo.update()
    end)
    |> add_revision()
    |> validate_version()
    |> add_operation(:svc, fn
      %{cluster: %{self: true} = cluster} -> {:ok, cluster}
      %{cluster: %{service_id: id} = cluster} when is_binary(id) ->
        cluster_service(cluster, user)
      %{cluster: cluster} -> {:ok, cluster}
    end)
    |> maybe_update_service(attrs, user)
    |> execute()
    |> when_ok(fn
      %{cluster: cluster, svc: %Service{} = svc} -> %{cluster | service: svc}
      %{cluster: cluster} -> cluster
    end)
    |> notify(:update, user)
  end

  @doc """
  Determines current status of this clusters upgrade plan given what information we currently have
  """
  @spec update_upgrade_plan(Cluster.t) :: cluster_resp
  def update_upgrade_plan(%Cluster{} = cluster) do
    %{api_deprecations: deps, upgrade_insights: insights} = cluster =
      Repo.preload(cluster, [:api_deprecations, :upgrade_insights])

    addons = runtime_services(cluster)
    Cluster.changeset(cluster, %{
      upgrade_plan: %{
        deprecations: length(deps) == 0 && Enum.all?(insights, & &1.status != :failed),
        compatibilities: !Enum.any?(addons, fn
          %{addon_version: %Version{} = vsn} ->
            Version.blocking?(vsn, cluster.current_version)
          _ -> false
        end),
        incompatibilities: true
      }
    })
    |> Repo.update()
  end

  defp add_revision(xact) do
    add_operation(xact, :revision, fn %{cluster: cluster} ->
      cluster = Repo.preload(cluster, [:node_pools])
      %ClusterRevision{cluster_id: cluster.id}
      |> ClusterRevision.changeset(%{
        version: cluster.version,
        cloud_settings: Console.mapify(cluster.cloud_settings),
        node_pools: Console.mapify(cluster.node_pools)
      })
      |> Repo.insert()
    end)
  end

  defp validate_version(xact) do
    add_operation(xact, :validate, fn %{cluster: cluster} ->
      cluster = Repo.preload(cluster, [:provider])
      case Versions.validate?(cluster) do
        true -> {:ok, cluster}
        false -> {:error, "invalid version #{cluster.version} for provider #{cluster.provider.name}"}
      end
    end)
  end

  @doc """
  Adds a new deploy token and saves the old one in the deploy tokens table for backwards compatibiility until purged
  """
  @spec rotate_deploy_token(Cluster.t) :: cluster_resp
  def rotate_deploy_token(%Cluster{id: id, deploy_token: token} = cluster) do
    user = Users.get_bot!("console")
    start_transaction()
    |> add_operation(:rotate, fn _ ->
      Cluster.changeset(%{cluster | deploy_token: nil})
      |> Repo.update()
    end)
    |> add_operation(:token, fn _ ->
      %DeployToken{token: token, cluster_id: id}
      |> DeployToken.changeset()
      |> Repo.insert()
    end)
    |> add_operation(:operator, fn %{rotate: cluster} ->
      Services.update_operator_service(cluster, tmp_admin(user))
    end)
    |> execute(extract: :rotate)
  end

  @doc """
  removes all old deploy tokens outside the expiration window (default 7 days)
  """
  @spec purge_deploy_tokens() :: {integer, term}
  def purge_deploy_tokens() do
    DeployToken.expired()
    |> Repo.delete_all()
  end

  @doc """
  applies a ping to a cluster, to be issued by the deploy operator
  """
  @spec ping(map, Cluster.t) :: cluster_resp
  def ping(attrs, %Cluster{id: id}) do
    cluster = get_cluster(id)
              |> Repo.preload([:insight_components])
    attrs = Map.merge(attrs, %{pinged_at: Timex.now(), installed: true})

    cluster
    |> Cluster.ping_changeset(stabilize_insight_components(attrs, cluster))
    |> Repo.update()
    |> notify(:ping)
  end

  defp stabilize_insight_components(%{insight_components: [_ | _] = new} = attrs, %Cluster{insight_components: existing}) do
    key = fn %{group: g, version: v, kind: k, name: n} = attrs -> {g, v, k, Map.get(attrs, :namespace), n} end
    by_key = Map.new(existing, & {key.(&1), &1.id})
    Map.put(attrs, :insight_components, Enum.map(new, &Map.put(&1, :id, by_key[key.(&1)])))
  end
  defp stabilize_insight_components(attrs, _), do: attrs

  @doc """
  Marks a cluster to be deleted, with hard deletes following a successful drain
  """
  @spec delete_cluster(binary, User.t) :: cluster_resp
  def delete_cluster(id, %User{} = user) do
    start_transaction()
    |> add_operation(:cluster, fn _ ->
      get_cluster!(id)
      |> Ecto.Changeset.change(%{deleted_at: Timex.now()})
      |> allow(user, :delete)
      |> when_ok(:update)
    end)
    |> add_operation(:svcs, fn _ ->
      Service.for_cluster(id)
      |> Service.drainable()
      |> Repo.update_all(set: [deleted_at: Timex.now()])
      |> ok()
    end)
    |> execute(extract: :cluster)
    |> notify(:delete, user)
  end

  @doc """
  Only deletes a virtual clusters
  """
  @spec delete_virtual_cluster(binary, User.t) :: cluster_resp
  def delete_virtual_cluster(id, %User{} = user) when is_binary(id) do
    case get_cluster!(id) do
      %Cluster{virtual: true} = cluster -> {:ok, cluster}
      _ -> {:error, "not a virtual cluster"}
    end
    |> when_ok(&allow(&1, user, :write))
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Deletes a cluster (cascading to all cluster services) without attempting a drain.
  """
  @spec detach_cluster(binary, User.t) :: cluster_resp
  def detach_cluster(id, %User{} = user) do
    get_cluster!(id)
    |> Cluster.changeset()
    |> allow(user, :delete)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  def drained(%Cluster{deleted_at: nil}), do: {:error, "not deleted"}
  def drained(%Cluster{service_id: id}) when is_binary(id),
    do: Services.delete_service(id)
  def drained(%Cluster{} = cluster), do: Console.Repo.delete(cluster)

  @doc """
  Creates a new capi provider and configures deployment into the management cluster
  """
  @spec create_provider(map, User.t) :: cluster_provider_resp
  def create_provider(attrs, %User{} = user) do
    start_transaction()
    |> add_operation(:create, fn _ ->
      %ClusterProvider{}
      |> ClusterProvider.changeset(attrs)
      |> allow(user, :create)
      |> when_ok(:insert)
    end)
    |> add_operation(:validate, fn %{create: prov} ->
        case {Repo.preload(local_cluster(), [:provider]), prov} do
          {%{provider: %{cloud: "gcp"}}, %{cloud: "azure"}} ->
            {:error, "cannot safely use the azure provider on GCP due to a conflict with workload identity"}
          {_, prov} -> {:ok, prov}
        end
    end)
    |> add_operation(:svc, fn
      %{create: %{self: true} = prov} -> {:ok, prov}
      %{create: prov} -> provider_service(prov, tmp_admin(user))
    end)
    |> add_operation(:rewire, fn
      %{svc: %ClusterProvider{} = prov} -> {:ok, prov}
      %{svc: %{id: id}, create: provider} ->
        Ecto.Changeset.change(provider, %{service_id: id})
        |> Console.Repo.update()
    end)
    |> execute(extract: :rewire)
    |> notify(:create, user)
  end

  @doc """
  It can create a new provider credential to be used for multi-tenant capi creates.
  """
  @spec create_provider_credential(map, binary, User.t) :: credential_resp
  def create_provider_credential(attrs, name, %User{} = user) do
    start_transaction()
    |> add_operation(:provider, fn _ ->
      get_provider_by_name(name)
      |> allow(user, :create)
    end)
    |> add_operation(:credential, fn %{provider: provider} ->
      %ProviderCredential{provider_id: provider.id}
      |> ProviderCredential.changeset(attrs, provider)
      |> Repo.insert()
    end)
    |> execute(extract: :credential)
    |> notify(:create, user)
  end

  @doc """
  Deletes a provider credential by id
  """
  @spec delete_provider_credential(binary, User.t) :: credential_resp
  def delete_provider_credential(id, %User{} = user) do
    Repo.get(ProviderCredential, id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  It will update capi provider settings
  """
  @spec update_provider(map, binary, User.t) :: cluster_provider_resp
  def update_provider(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:provider, fn _ ->
      get_provider!(id)
      |> ClusterProvider.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:svc, fn
      %{provider: %{service_id: id} = provider} when is_binary(id) ->
        provider_service(provider, user)
      %{provider: provider} -> {:ok, provider}
    end)
    |> maybe_update_service(attrs, user)
    |> execute(extract: :provider)
    |> notify(:update, user)
  end

  @doc """
  Deletes a cluster provider.  This will fail if:
  * user doesn't have write perms on the provider
  * there are clusters tied to the provider
  """
  @spec delete_provider(binary, User.t) :: cluster_provider_resp
  def delete_provider(id, %User{} = user) do
    start_transaction()
    |> add_operation(:provider, fn _ ->
      get_provider!(id)
      |> Ecto.Changeset.change(%{deleted_at: Timex.now()})
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:exists, fn %{provider: %{id: id} = provider} ->
      case has_cluster?(id) do
        true -> {:error, "cannot delete providers with bound clusters"}
        false -> {:ok, provider}
      end
    end)
    |> add_operation(:svc, fn %{provider: %{service_id: svc_id}} ->
      Services.force_delete_service(svc_id, user)
    end)
    |> execute(extract: :provider)
    |> notify(:delete, user)
  end

  @doc """
  modifies rbac settings for this cluster
  """
  @spec rbac(map, binary, User.t) :: cluster_resp
  def rbac(attrs, cluster_id, %User{} = user) do
    get_cluster!(cluster_id)
    |> Repo.preload([:read_bindings, :write_bindings])
    |> allow(user, :write)
    |> when_ok(&Cluster.rbac_changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  modifies rbac settings for this provider
  """
  @spec provider_rbac(map, binary, User.t) :: cluster_resp
  def provider_rbac(attrs, provider_id, %User{} = user) do
    get_provider!(provider_id)
    |> Repo.preload([:read_bindings, :write_bindings])
    |> allow(user, :write)
    |> when_ok(&ClusterProvider.rbac_changeset(&1, attrs))
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Creates a new cluster registration, with inferred project id if necessary
  """
  @spec create_cluster_registration(map, User.t) :: reg_resp
  def create_cluster_registration(attrs, %User{} = user) do
    %ClusterRegistration{creator_id: user.id}
    |> ClusterRegistration.changeset(Settings.add_project_id(attrs, user))
    |> allow(user, :create)
    |> when_ok(:insert)
  end

  @doc """
  Adds cluster data to the registration, eg name/handle/tags and tests for validity
  """
  @spec update_cluster_registration(map, binary, %User{}) :: reg_resp
  def update_cluster_registration(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:update, fn _ ->
      Repo.get!(ClusterRegistration, id)
      |> ClusterRegistration.changeset(attrs)
      |> ClusterRegistration.update_changeset()
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:test, fn %{update: %ClusterRegistration{handle: handle} = reg} ->
      case get_cluster_by_handle(handle) do
        %Cluster{} -> {:error, "a cluster already exists with handle #{handle}"}
        _ -> {:ok, reg}
      end
    end)
    |> execute(extract: :update)
  end

  @doc """
  Removes the registration if allowed
  """
  @spec delete_cluster_registration(binary, User.t) :: reg_resp
  def delete_cluster_registration(id, %User{} = user) do
    Repo.get!(ClusterRegistration, id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  def create_agent_migration(attrs, %User{} = user) do
    %AgentMigration{}
    |> AgentMigration.changeset(attrs)
    |> allow(user, :create)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  def create_agent_migration(attrs) do
    %AgentMigration{}
    |> AgentMigration.changeset(attrs)
    |> Repo.insert()
  end

  def apply_migration(%AgentMigration{id: id} = migration) do
    bot = %{Users.get_bot!("console") | roles: %{admin: true}}
    Service.agent()
    |> Service.stream()
    |> Repo.stream(method: :keyset)
    |> Stream.each(fn svc ->
      Logger.info "applying agent migration #{id} for #{svc.id}"
      AgentMigration.updates(migration, svc)
      |> Services.update_service(svc.id, bot)
    end)
    |> Stream.run()

    complete_migration(migration)
  end
  def apply_migration(_), do: :ok

  defp complete_migration(%AgentMigration{} = migration) do
    AgentMigration.changeset(migration, %{completed: true})
    |> Repo.update()
  end

  @doc """
  Grabs the readme for a runtime service registered in a cluster
  """
  @spec readme(AddOn.t) :: {:ok, binary} | Console.error
  def readme(%AddOn{readme_url: url}) when is_binary(url), do: readme_fetch(url)
  def readme(%AddOn{git_url: "https://github.com" <> _ = url}),
    do: readme_fetch("#{url}/raw/{branch}/README.md")
  def readme(%AddOn{git_url: "https://gitlab.com" <> _ = url}),
    do: readme_fetch("#{url}/-/raw/{branch}/README.md")
  def readme(_), do: {:ok, nil}

  @decorate cacheable(cache: @cache_adapter, key: {:readme, url}, opts: [ttl: @readme_ttl])
  defp readme_fetch(url) do
    Enum.find_value(~w(main master), {:ok, nil}, fn branch ->
      String.replace(url, "{branch}", branch)
      |> HTTPoison.get([], follow_redirect: true)
      |> case do
        {:ok, %HTTPoison.Response{status_code: 200, body: body}} -> {:ok, body}
        _ -> nil
      end
    end)
  end

  @doc """
  Fetches the changelog url for an add-on at a specific version
  """
  @spec release(AddOn.t, binary) :: {:ok, binary} | Console.error
  def release(%AddOn{release_url: release}, vsn) when is_binary(release),
    do: {:ok, String.replace(release, "{vsn}", vsn)}
  def release(%AddOn{}, _vsn), do: {:ok, nil}

  @spec cloud_addons(Cluster.t | binary) :: [CloudAddon.t]
  def cloud_addons(%Cluster{id: id}), do: cloud_addons(id)
  def cloud_addons(id) when is_binary(id) do
    CloudAddon.for_cluster(id)
    |> CloudAddon.ordered()
    |> Repo.all()
    |> Enum.map(&with_addon/1)
  end

  @spec runtime_services(Cluster.t | binary) :: [RuntimeService.t]
  def runtime_services(%Cluster{id: id}), do: runtime_services(id)
  def runtime_services(id) when is_binary(id) do
    RuntimeService.for_cluster(id)
    |> RuntimeService.ordered()
    |> Repo.all()
    |> Enum.map(&with_addon/1)
  end

  defp with_addon(%RuntimeService{} = svc) do
    case Table.fetch(svc.name) do
      %Compatibilities.AddOn{} = addon ->
        vsn = Compatibilities.AddOn.find_version(addon, Validations.clean_version(svc.version))
        Map.merge(svc, %{
          addon: addon,
          addon_version: vsn && Map.put(vsn, :addon, addon)
        })
      _ -> svc
    end
  end

  defp with_addon(%CloudAddon{} = addon) do
    case CloudAddOns.fetch(addon) do
      %Compatibilities.CloudAddOn{} = cloud ->
        vsn = Compatibilities.CloudAddOn.find_version(cloud, addon.version)
        Map.merge(addon, %{info: cloud, version_info: vsn})
      _ -> addon
    end
  end

  defp with_addon(pass), do: pass

  @doc """
  Upserts a list of runtime service entries for a cluster (and optionally labels their service id)
  """
  @spec create_runtime_services([map], binary, Cluster.t) :: {:ok, integer} | Console.error
  def create_runtime_services(svcs, service_id, %Cluster{id: id}) do
    replace = if is_nil(service_id),
                do: [:name, :version],
                else: [:name, :version, :service_id]
    merge_attrs = %{cluster_id: id, inserted_at: Timex.now(), updated_at: Timex.now()}
    merge_attrs = if is_nil(service_id),
                    do: merge_attrs,
                    else: Map.put(merge_attrs, :service_id, service_id)

    Enum.filter(svcs, fn
      %{name: n} -> Table.fetch(n)
      _ -> false
    end)
    |> Enum.map(fn
      %{version: v} = map when is_binary(v) ->
        Map.put(map, :version, Validations.clean_version(v))
      m -> m
    end)
    |> Enum.map(&Map.merge(&1, merge_attrs))
    |> case do
      [_ | _] = services ->
        with {:ok, {count, del_count}} = insert_and_prune_runtime(id, services, replace) do
          Logger.info "persisted #{count} runtime services and pruned #{del_count} services"
          {:ok, count}
        end
      _ -> {:ok, 0}
    end
  end

  defp insert_and_prune_runtime(cluster_id, services, replace) do
    start_transaction()
    |> add_operation(:insert, fn _ ->
      {count, created} = Repo.insert_all(
        RuntimeService,
        services,
        returning: true,
        on_conflict: {:replace, replace},
        conflict_target: [:cluster_id, :name]
      )
      {:ok, {count, created}}
    end)
    |> add_operation(:prune, fn %{insert: {_, created}} ->
      svcs = RuntimeService.for_cluster(cluster_id) |> Repo.all()
      keep = MapSet.new(created, & &1.id)
      filtered = Enum.filter(svcs, & !MapSet.member?(keep, &1.id))
                 |> Enum.map(& &1.id)

      case Enum.empty?(filtered) do
        true -> {:ok, 0}
        false ->
          RuntimeService.for_ids(filtered)
          |> Repo.delete_all()
          |> elem(0)
          |> ok()
      end
    end)
    |> execute()
    |> case do
      {:ok, %{insert: {count, _}, prune: del_count}} -> {:ok, {count, del_count}}
      err -> err
    end
  end

  @doc """
  Creates a new pinned custom resource, can be cluster or global scoped
  """
  @spec create_pinned_custom_resource(map, User.t) :: pinned_resp
  def create_pinned_custom_resource(attrs, %User{} = user) do
    %PinnedCustomResource{}
    |> PinnedCustomResource.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
  end

  @doc """
  Creates a new pinned custom resource, can be cluster or global scoped
  """
  @spec delete_pinned_custom_resource(binary, User.t) :: pinned_resp
  def delete_pinned_custom_resource(id, %User{} = user) do
    Repo.get!(PinnedCustomResource, id)
    |> allow(user, :write)
    |> when_ok(:delete)
  end

  @doc """
  Saves upgrade insights for a cluster
  """
  @spec save_upgrade_insights([map], Cluster.t) :: {:ok, [UpgradeInsight.t]} | Console.error
  def save_upgrade_insights(%{insights: insights} = attrs, %Cluster{id: id}) do
    start_transaction()
    |> add_operation(:insights, fn _ ->
      prune_and_save(UpgradeInsight, insights, id)
    end)
    |> add_operation(:addons, fn _ ->
      prune_and_save(CloudAddon, attrs[:addons] || [], id)
    end)
    |> execute(extract: :insights)
    |> when_ok(fn res ->
      Enum.filter(res, fn
        {{:record, _}, _} -> true
        _ -> false
      end)
      |> Enum.map(fn {_, v} -> v end)
    end)
  end

  defp prune_and_save(schema, records, cluster_id) do
    xact = add_operation(start_transaction(), :prune, fn _ ->
      schema.for_cluster(cluster_id)
      |> Repo.delete_all()
      |> ok()
    end)

    Enum.with_index(records)
    |> Enum.reduce(xact, fn {attrs, ind}, xact ->
      add_operation(xact, {:record, ind}, fn _ ->
        struct(schema, %{cluster_id: cluster_id})
        |> schema.changeset(attrs)
        |> Repo.insert()
      end)
    end)
    |> execute()
  end

  def kas_url() do
    kas_dns()
    |> URI.parse()
    |> Map.put(:scheme, "wss")
    |> URI.to_string()
  end

  def kas_proxy_url() do
    kas_dns()
    |> URI.parse()
    |> Map.put(:path, "/k8s-proxy")
    |> URI.to_string()
  end

  def controller_service(%Cluster{self: true, id: cluster_id}) do
    user = Users.get_bot!("console") |> tmp_admin()
    start_transaction()
    |> add_operation(:token, fn _ ->
      Users.create_access_token(user)
    end)
    |> add_operation(:svc, fn %{token: token} ->
      Services.create_service(%{
        name: "console-controller",
        namespace: "plrl-console",
        helm: %{
          url: "https://pluralsh.github.io/console",
          chart: "controller",
          version: "x.x.x",
          values: Jason.encode!(%{
            consoleUrl: Console.url("/gql"),
            tokenSecretRef: %{
              create: true,
              token: token.token,
            },
          })
        }
      }, cluster_id, user)
    end)
    |> execute()
  end

  defp kas_dns() do
    case Console.conf(:kas_dns) do
      "http" <> _ = dns -> dns
      dns -> "https://#{dns}"
    end
  end

  defp cluster_service(%Cluster{service_id: nil, provider: %ClusterProvider{} = provider} = cluster, %User{} = user) do
    {ns, name} = namespace_name(cluster)
    Console.Repo.preload(cluster, [:node_pools])
    |> cluster_attributes()
    |> Map.merge(%{
      repository_id: provider.repository_id || Git.artifacts_repo!().id,
      name: name,
      protect: true,
      namespace: ns,
      git: Map.take(provider.git, ~w(ref folder)a),
    })
    |> Services.create_service(local_cluster().id, user)
  end
  defp cluster_service(%Cluster{service_id: id} = cluster, %User{} = user) do
    %{configuration: config} = Console.Repo.preload(cluster, [:node_pools, :credential])
                               |> cluster_attributes()
    Services.merge_service(config, id, user)
  end

  defp namespace_name(%Cluster{name: n, provider: %ClusterProvider{} = provider, credential: %ProviderCredential{} = cred}),
    do: {cred.namespace, "cluster-#{provider.name}-#{cred.name}-#{n}"}
  defp namespace_name(%Cluster{name: n, provider: %ClusterProvider{} = provider}), do: {provider.namespace, "cluster-#{provider.name}-#{n}"}

  defp cluster_attributes(%{node_pools: node_pools} = cluster) do
    %{
      configuration: [
        %{name: "clusterId", value: cluster.id},
        %{name: "consoleUrl", value: Services.api_url("gql")},
        %{name: "deployToken", value: cluster.deploy_token},
        %{name: "operatorNamespace", value: "plrl-deploy-operator"},
        %{name: "clusterName", value: cluster.name},
        %{name: "version", value: cluster.version},
        %{name: "nodePools", value: Jason.encode!(node_pools)}
        | credential_config(cluster) ++ Configuration.conf(cluster)
      ]
    }
  end

  defp credential_config(%{credential: %ProviderCredential{} = cred}), do: [%{name: "credential", value: Jason.encode!(cred)}]
  defp credential_config(_), do: []

  defp provider_service(%ClusterProvider{service_id: nil, name: name} = provider, %User{} = user) do
    provider_attributes(provider)
    |> Map.merge(%{
      repository_id: Git.artifacts_repo!().id,
      name: "capi-#{name}",
      protect: true,
      namespace: provider.namespace,
      git: %{ref: "main", folder: "capi/providers/#{provider.cloud}"},
    })
    |> Services.create_service(local_cluster().id, tmp_admin(user))
  end
  defp provider_service(%ClusterProvider{service_id: id} = provider, %User{} = user) do
    %{configuration: config} = provider_attributes(provider)
    Services.merge_service(config, id, tmp_admin(user))
  end

  defp maybe_update_service(xact, %{service: %{} = service_attrs}, %User{} = user) do
    add_operation(xact, :svc_update, fn
      %{svc: %Service{id: id}} ->
        Services.update_service(service_attrs, id, tmp_admin(user))
      %{svc: svc} -> {:ok, svc}
    end)
  end
  defp maybe_update_service(xact, _, _), do: xact

  defp provider_attributes(%ClusterProvider{cloud_settings: %{aws: %{access_key_id: aid, secret_access_key: sak}}} = prov) do
    %{
      configuration: [
        %{name: "providerName", value: prov.name},
        %{name: "accessKeyId", value: aid},
        %{name: "secretAccessKey", value: sak}
      ]
    }
  end

  defp provider_attributes(%ClusterProvider{cloud_settings: %{gcp: %{application_credentials: ac}}} = prov) do
    %{
      configuration: [
        %{name: "providerName", value: prov.name},
        %{name: "applicationCredentials", value: ac},
        %{name: "applicationCredentialsBase64", value: Base.encode64(ac)},
      ]
    }
  end

  defp provider_attributes(%ClusterProvider{name: name, cloud_settings: %{azure: %ClusterProvider.CloudSettings.Azure{} = az}}) do
    %{
      configuration: [
        %{name: "providerName", value: name},
        %{name: "subscriptionId", value: az.subscription_id},
        %{name: "tenantId", value: az.tenant_id},
        %{name: "clientId", value: az.client_id},
        %{name: "clientSecret", value: az.client_secret},
      ]
    }
  end

  defp provider_attributes(%ClusterProvider{name: name}), do: %{configuration: [%{name: "providerName", value: name}]}

  defp tmp_admin(%User{} = user), do: %{user | roles: %{admin: true}, bootstrap: nil}

  defp add_errors(%Cluster{} = cluster, errors) when is_list(errors) do
    Repo.preload(cluster, [:service_errors])
    |> Cluster.changeset(%{service_errors: errors})
    |> Repo.update()
  end

  defp notify({:ok, %Cluster{} = cluster}, :ping),
    do: handle_notify(PubSub.ClusterPinged, cluster)
  defp notify(pass, _), do: pass

  defp notify({:ok, %Cluster{} = cluster}, :create, user),
    do: handle_notify(PubSub.ClusterCreated, cluster, actor: user)
  defp notify({:ok, %Cluster{} = cluster}, :update, user),
    do: handle_notify(PubSub.ClusterUpdated, cluster, actor: user)
  defp notify({:ok, %Cluster{} = cluster}, :delete, user),
    do: handle_notify(PubSub.ClusterDeleted, cluster, actor: user)

  defp notify({:ok, %ClusterProvider{} = prov}, :create, user),
    do: handle_notify(PubSub.ProviderCreated, prov, actor: user)
  defp notify({:ok, %ClusterProvider{} = prov}, :update, user),
    do: handle_notify(PubSub.ProviderUpdated, prov, actor: user)
  defp notify({:ok, %ClusterProvider{} = prov}, :delete, user),
    do: handle_notify(PubSub.ProviderDeleted, prov, actor: user)

  defp notify({:ok, %ProviderCredential{} = prov}, :create, user),
    do: handle_notify(PubSub.ProviderCredentialCreated, prov, actor: user)
  defp notify({:ok, %ProviderCredential{} = prov}, :delete, user),
    do: handle_notify(PubSub.ProviderCredentialDeleted, prov, actor: user)

  defp notify({:ok, %AgentMigration{} = migration}, :create, user),
    do: handle_notify(PubSub.AgentMigrationCreated, migration, actor: user)

  defp notify(pass, _, _), do: pass
end
