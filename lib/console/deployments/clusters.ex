defmodule Console.Deployments.Clusters do
  use Console.Services.Base
  use Nebulex.Caching
  import Console.Deployments.Policies
  alias Console.PubSub
  alias Console.Commands.{Tee, Command}
  alias Console.Deployments.{Services, Git, Providers.Configuration}
  alias Console.Deployments.Providers.Versions
  alias Console.Deployments.Compatibilities.Table
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
    RuntimeService
  }
  alias Console.Deployments.Compatibilities
  require Logger

  @cache_adapter Console.conf(:cache_adapter)
  @local_adapter Console.conf(:local_cache)
  @node_ttl :timer.minutes(30)

  @type cluster_resp :: {:ok, Cluster.t} | Console.error
  @type cluster_provider_resp :: {:ok, ClusterProvider.t} | Console.error
  @type credential_resp :: {:ok, ProviderCredential.t} | Console.error
  @type runtime_service_resp :: {:ok, RuntimeService.t} | Console.error

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

  def get_cluster_by_handle(handle), do: Console.Repo.get_by(Cluster, handle: handle)

  def get_cluster_by_handle!(handle), do: Console.Repo.get_by!(Cluster, handle: handle)

  def has_cluster?(%ClusterProvider{id: id}), do: has_cluster?(id)
  def has_cluster?(provider_id) do
    Cluster.for_provider(provider_id)
    |> Repo.exists?()
  end

  @spec control_plane(Cluster.t) :: Kazan.Server.t | {:error, term}
  def control_plane(%Cluster{id: id, self: true}), do: Kazan.Server.in_cluster()
  def control_plane(%Cluster{id: id, kubeconfig: %{raw: raw}}), do: Kazan.Server.from_kubeconfig_raw(raw)
  def control_plane(%Cluster{id: id} = cluster), do: control_plane(cluster, Users.console(), %{"cached" => true})

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
      do: @local_adapter.put({:nodes, id}, {:ok, nodes}, ttl: @node_ttl)
  end

  def warm(:node_metrics, %Cluster{id: id} = cluster) do
    with {:ok, metrics} <- fetch_node_metrics(cluster),
      do: @local_adapter.put({:node_metrics, id}, {:ok, metrics}, ttl: @node_ttl)
  end

  @doc """
  Fetches the nodes for a cluster, this query is heavily cached for performance
  """
  @spec nodes(Cluster.t) :: {:ok, term} | Console.error
  @decorate cacheable(cache: @local_adapter, key: {:nodes, id}, opts: [ttl: @node_ttl])
  def nodes(%Cluster{id: id} = cluster), do: fetch_nodes(cluster)

  defp fetch_nodes(%Cluster{pinged_at: nil, self: false}), do: {:ok, []}
  defp fetch_nodes(%Cluster{} = cluster) do
    with %Kazan.Server{} = server <- control_plane(cluster),
         _ <- Kube.Utils.save_kubeconfig(server),
         {:ok, %{items: items}} <- Core.list_node!() |> Kube.Utils.run() do
      {:ok, items}
    else
      _ -> {:ok, []}
    end
  end


  @doc """
  Fetches the node metrics for a cluster, this query is heavily cached for performance
  """
  @spec node_metrics(Cluster.t) :: {:ok, term} | Console.error
  @decorate cacheable(cache: @local_adapter, key: {:node_metrics, id}, opts: [ttl: @node_ttl])
  def node_metrics(%Cluster{id: id} = cluster), do: fetch_node_metrics(cluster)

  defp fetch_node_metrics(%Cluster{pinged_at: nil, self: false}), do: {:ok, []}
  defp fetch_node_metrics(%Cluster{} = cluster) do
    with %Kazan.Server{} = server <- control_plane(cluster),
         _ <- Kube.Utils.save_kubeconfig(server),
         {:ok, %{items: items}} <- Kube.Client.list_metrics() do
      {:ok, items}
    else
      _ -> {:ok, []}
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
    tee = Tee.new()
    Command.set_build(tee)
    url = Services.api_url("gql")
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
    tee = Tee.new()
    Command.set_build(tee)
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
    |> add_operation(:cluster, fn _ ->
      %Cluster{}
      |> Cluster.changeset(attrs)
      |> allow(user, :create)
      |> when_ok(:insert)
    end)
    |> add_revision()
    |> validate_version()
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
      %{cluster_service: %Cluster{} = cluster} -> {:ok, cluster}
      %{cluster_service: %Service{id: id}, cluster: cluster} ->
        Console.Repo.preload(cluster, [:write_bindings])
        |> Cluster.changeset(%{service_id: id, write_bindings: [%{user_id: user.id}]})
        |> Console.Repo.update()
    end)
    |> execute(extract: :rewire)
    |> when_ok(& %{&1 | token_readable: true})
    |> notify(:create, user)
  end

  @doc """
  It will update cluster settings
  """
  @spec update_cluster(map, binary, User.t) :: cluster_resp
  def update_cluster(attrs, id, %User{} = user) do
    start_transaction()
    |> add_operation(:cluster, fn _ ->
      get_cluster!(id)
      |> Console.Repo.preload([:node_pools, :service])
      |> Cluster.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:update)
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
    attrs = Map.merge(attrs, %{pinged_at: Timex.now(), installed: true})
    get_cluster(id)
    |> Cluster.ping_changeset(attrs)
    |> Repo.update()
  end

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
  Deletes a cluster (cascading to all cluster services) without attempting a drain.
  """
  @spec detach_cluster(binary, User.t) :: cluster_resp
  def detach_cluster(id, %User{} = user) do
    get_cluster!(id)
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

  @spec runtime_services(Cluster.t | binary) :: [RuntimeService.t]
  def runtime_services(%Cluster{id: id}), do: runtime_services(id)
  def runtime_services(id) when is_binary(id) do
    RuntimeService.for_cluster(id)
    |> RuntimeService.ordered()
    |> Repo.all()
    |> Enum.map(fn svc ->
      case Table.fetch(svc.name) do
        %Compatibilities.AddOn{} = addon ->
          Map.merge(svc, %{
            addon: addon,
            addon_version: Compatibilities.AddOn.find_version(addon, Validations.clean_version(svc.version))
          })
        _ -> svc
      end
    end)
  end

  @doc """
  Upserts a list of runtime service entries for a cluster (and optionally labels their service id)
  """
  @spec create_runtime_services([map], binary, Cluster.t) :: {:ok, integer} | Console.error
  def create_runtime_services(svcs, service_id, %Cluster{id: id}) do
    replace = if is_nil(service_id), do: [:name, :version], else: [:name, :version, :service_id]
    Enum.filter(svcs, fn
      %{name: n} -> Table.fetch(n)
      _ -> false
    end)
    |> Enum.map(fn
      %{version: v} = map -> Map.put(map, :version, Validations.clean_version(v))
      m -> m
    end)
    |> Enum.map(&Map.merge(&1, %{
      cluster_id: id,
      service_id: service_id,
      inserted_at: Timex.now(),
      updated_at: Timex.now()
    }))
    |> case do
      [_ | _] = services ->
        {count, _} = Repo.insert_all(
          RuntimeService,
          services,
          on_conflict: {:replace, replace},
          conflict_target: [:cluster_id, :name]
        )
        {:ok, count}

      _ -> {:ok, 0}
    end
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

  defp tmp_admin(%User{} = user), do: %{user | roles: %{admin: true}}

  defp add_errors(%Cluster{} = cluster, errors) when is_list(errors) do
    Repo.preload(cluster, [:service_errors])
    |> Cluster.changeset(%{service_errors: errors})
    |> Repo.update()
  end

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

  defp notify(pass, _, _), do: pass
end
