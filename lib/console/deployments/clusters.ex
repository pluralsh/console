defmodule Console.Deployments.Clusters do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.PubSub
  alias Console.Deployments.{Services, Git}
  alias Console.Services.Users
  alias Console.Schema.{Cluster, User, ClusterProvider, Service, DeployToken, ClusterRevision}

  @type cluster_resp :: {:ok, Cluster.t} | Console.error
  @type cluster_provider_resp :: {:ok, ClusterProvider.t} | Console.error

  def get_cluster(id), do: Console.Repo.get(Cluster, id)

  def get_cluster_by_handle(handle), do: Console.Repo.get_by(Cluster, handle: handle)

  def get_cluster_by_handle!(handle), do: Console.Repo.get_by!(Cluster, handle: handle)

  def find!(identifier) do
    case Uniq.UUID.parse(identifier) do
      {:ok, _} -> get_cluster!(identifier)
      _ -> get_cluster_by_handle!(identifier)
    end
  end

  def get_cluster!(id), do: Console.Repo.get!(Cluster, id)

  def get_provider!(id), do: Console.Repo.get!(ClusterProvider, id)

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
    |> add_operation(:service, fn %{cluster: cluster} ->
      Services.operator_service(cluster, tmp_admin(user))
    end)
    |> add_operation(:cluster_service, fn %{cluster: cluster} ->
      case Console.Repo.preload(cluster, [:provider]) do
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
      |> Console.Repo.preload([:node_pools])
      |> Cluster.changeset(attrs)
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> add_revision()
    |> add_operation(:svc, fn
      %{cluster: %{service_id: id} = cluster} when is_binary(id) ->
        cluster_service(cluster, user)
      %{cluster: cluster} -> {:ok, cluster}
    end)
    |> execute(extract: :cluster)
    |> notify(:update, user)
  end

  defp add_revision(xact) do
    add_operation(xact, :revision, fn %{cluster: cluster} ->
      cluster = Repo.preload(cluster, [:node_pools])
      %ClusterRevision{cluster_id: cluster.id}
      |> ClusterRevision.changeset(%{
        version: cluster.version,
        cloud_settings: cluster.cloud_settings,
        node_pools: Enum.map(cluster.node_pools, &Piazza.Ecto.Schema.mapify/1)
      })
      |> Repo.insert()
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
    get_cluster(id)
    |> Cluster.ping_changeset(Map.put(attrs, :pinged_at, Timex.now()))
    |> Repo.update()
  end

  @doc """
  Marks a cluster to be deleted, with hard deletes following a successful drain
  """
  @spec delete_cluster(binary, User.t) :: cluster_resp
  def delete_cluster(id, %User{} = user) do
    get_cluster!(id)
    |> Ecto.Changeset.change(%{deleted_at: Timex.now()})
    |> allow(user, :delete)
    |> when_ok(:update)
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
      |> ClusterProvider.changeset(Console.dedupe(attrs, :repository_id, fn -> Git.artifacts_repo!().id end))
      |> allow(user, :create)
      |> when_ok(:insert)
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
    |> execute(extract: :provider)
    |> notify(:update, user)
  end

  @doc """
  modifies rbac settings for this cluster
  """
  @spec rbac(map, binary, User.t) :: cluster_resp
  def rbac(attrs, cluster_id, %User{} = user) do
    get_cluster!(cluster_id)
    |> Cluster.rbac_changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  modifies rbac settings for this provider
  """
  @spec provider_rbac(map, binary, User.t) :: cluster_resp
  def provider_rbac(attrs, provider_id, %User{} = user) do
    get_provider!(provider_id)
    |> ClusterProvider.rbac_changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  defp cluster_service(%Cluster{service_id: nil, provider: %ClusterProvider{} = provider} = cluster, %User{} = user) do
    Console.Repo.preload(cluster, [:node_pools])
    |> cluster_attributes()
    |> Map.merge(%{
      repository_id: provider.repository_id,
      name: "cluster-#{cluster.name}",
      namespace: provider.namespace,
      git: Map.take(provider.git, ~w(ref folder)a),
    })
    |> Services.create_service(local_cluster().id, user)
  end
  defp cluster_service(%Cluster{service_id: id} = cluster, %User{} = user) do
    Console.Repo.preload(cluster, [:node_pools])
    |> cluster_attributes()
    |> Services.update_service(id, user)
  end

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
      ]
    }
  end

  defp provider_service(%ClusterProvider{service_id: nil, name: name} = provider, %User{} = user) do
    provider_attributes(provider)
    |> Map.merge(%{
      repository_id: Git.artifacts_repo!().id,
      name: "capi-#{name}",
      namespace: provider.namespace,
      git: %{ref: "main", folder: "capi/providers/#{provider.cloud}"},
    })
    |> Services.create_service(local_cluster().id, tmp_admin(user))
  end
  defp provider_service(%ClusterProvider{service_id: id} = provider, %User{} = user) do
    provider_attributes(provider)
    |> Services.update_service(id, tmp_admin(user))
  end

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
      ]
    }
  end

  defp provider_attributes(%ClusterProvider{name: name}), do: %{configuration: [%{name: "providerName", value: name}]}

  defp tmp_admin(%User{} = user), do: %{user | roles: %{admin: true}}

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

  defp notify(pass, _, _), do: pass
end
