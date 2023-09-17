defmodule Console.Deployments.Clusters do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Deployments.{Services, Git}
  alias Console.Schema.{Cluster, User, ClusterProvider, Service}

  @type cluster_resp :: {:ok, Cluster.t} | Console.error
  @type cluster_provider_resp :: {:ok, ClusterProvider.t} | Console.error

  def get_cluster(id), do: Console.Repo.get(Cluster, id)

  def get_cluster!(id), do: Console.Repo.get!(Cluster, id)

  def get_provider!(id), do: Console.Repo.get!(ClusterProvider, id)

  def get_by_deploy_token(token), do: Console.Repo.get_by(Cluster, deploy_token: token)

  def local_cluster(), do: Console.Repo.get_by!(Cluster, self: true)

  def services(%Cluster{id: id}) do
    Service.for_cluster(id)
    |> Console.Repo.all()
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
    |> add_operation(:service, fn %{cluster: cluster} ->
      Services.operator_service(cluster.deploy_token, cluster.id, tmp_admin(user))
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
  end

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
        %{name: "cluster-name", value: cluster.name},
        %{name: "version", value: cluster.version},
        %{name: "node-pools", value: Jason.encode!(node_pools)}
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
        %{name: "provider-name", value: prov.name},
        %{name: "access-key-id", value: aid},
        %{name: "secret-access-key", value: sak}
      ]
    }
  end

  defp provider_attributes(%ClusterProvider{cloud_settings: %{gcp: %{application_credentials: ac}}} = prov) do
    %{
      configuration: [
        %{name: "provider-name", value: prov.name},
        %{name: "application-credentials", value: ac},
      ]
    }
  end

  defp provider_attributes(%ClusterProvider{name: name}), do: %{configuration: [%{name: "provider-name", value: name}]}

  defp tmp_admin(%User{} = user), do: %{user | roles: %{admin: true}}
end
