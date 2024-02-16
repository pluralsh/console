defmodule Console.Deployments.Backups do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Deployments.{Clusters, Services}
  alias Console.PubSub
  alias Console.Schema.{
    ClusterBackup,
    ClusterRestore,
    ClusterRestoreHistory,
    ObjectStore,
    Cluster,
    User,
    Service
  }

  @type object_store_resp :: {:ok, ObjectStore.t} | Console.error
  @type restore_resp :: {:ok, ClusterRestore.t} | Console.error
  @type backup_resp :: {:ok, ClusterBackup.t} | Console.error

  def get_object_store(id), do: Repo.get(ObjectStore, id)

  def get_object_store_by_name(name), do: Repo.get_by(ObjectStore, name: name)

  def get_cluster_restore(id), do: Repo.get(ClusterRestore, id)

  def get_cluster_backup(cluster_id, ns, name) do
    Repo.get_by(ClusterBackup, cluster_id: cluster_id, namespace: ns, name: name)
  end

  def get_cluster_backup(id), do: Repo.get(ClusterBackup, id)

  @doc """
  Creates a new object store credential to be used in backup/restores
  """
  @spec create_object_store(map, User.t) :: object_store_resp
  def create_object_store(attrs, %User{} = user) do
    %ObjectStore{}
    |> ObjectStore.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:insert)
    |> notify(:create, user)
  end

  @doc """
  Updates an object store credential in-place
  """
  @spec update_object_store(map, binary, User.t) :: object_store_resp
  def update_object_store(attrs, id, %User{} = user) do
    get_object_store(id)
    |> ObjectStore.changeset(attrs)
    |> allow(user, :write)
    |> when_ok(:update)
    |> notify(:update, user)
  end

  @doc """
  Deletes an object store credential, will cascade to all associated clusters
  """
  @spec delete_object_store(binary, User.t) :: object_store_resp
  def delete_object_store(id, %User{} = user) do
    get_object_store(id)
    |> allow(user, :write)
    |> when_ok(:delete)
    |> notify(:delete, user)
  end

  @doc """
  Creates a cluster backup reference, to be sent by a running deploy agent
  """
  @spec create_cluster_backup(map, Cluster.t) :: backup_resp
  def create_cluster_backup(%{namespace: ns, name: n} = attrs, %Cluster{id: id}) do
    case get_cluster_backup(id, ns, n) do
      %ClusterBackup{} = backup -> backup
      nil -> %ClusterBackup{cluster_id: id}
    end
    |> ClusterBackup.changeset(attrs)
    |> Repo.insert_or_update()
  end

  @doc """
  Creates a cluster restore object, binds it to its owning cluster, and writes a row to the history table
  """
  @spec create_cluster_restore(binary, User.t) :: restore_resp
  def create_cluster_restore(id, %User{} = user) do
    start_transaction()
    |> add_operation(:fetch, fn _ ->
      Repo.get(ClusterBackup, id)
      |> Repo.preload([:cluster])
      |> allow(user, :write)
    end)
    |> add_operation(:restore, fn %{fetch: backup} ->
      %ClusterRestore{}
      |> ClusterRestore.changeset(%{status: :created, backup_id: backup.id})
      |> Repo.insert()
    end)
    |> add_operation(:cluster, fn
      %{fetch: %{cluster: %{restore_id: id}}} when is_binary(id) -> {:error, "a restore is already in progress"}
      %{fetch: %{cluster: cluster}, restore: %{id: id}} ->
        Ecto.Changeset.change(cluster, %{restore_id: id})
        |> Repo.update()
    end)
    |> add_operation(:history, fn
      %{fetch: %{cluster: %{id: cluster_id}}, restore: %{id: id}} ->
        %ClusterRestoreHistory{}
        |> ClusterRestoreHistory.changeset(%{cluster_id: cluster_id, restore_id: id})
        |> Repo.insert()
    end)
    |> execute(extract: :restore)
    |> notify(:create, user)
  end

  @doc """
  Updates the status of a cluster restore
  """
  @spec update_cluster_restore(map, binary, Cluster.t) :: restore_resp
  def update_cluster_restore(attrs, id, %Cluster{}) do
    get_cluster_restore(id)
    |> ClusterRestore.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Binds an object store to a cluster, and sets up the velero service to initiate backup/restore
  """
  @spec configure_backups(binary, binary, User.t) :: Clusters.cluster_resp
  def configure_backups(store_id, cluster_id, %User{} = user) do
    start_transaction()
    |> add_operation(:cluster, fn _ ->
      Clusters.get_cluster(cluster_id)
      |> allow(user, :write)
    end)
    |> add_operation(:store, fn _ ->
      get_object_store(store_id)
      |> allow(user, :read)
    end)
    |> add_operation(:update, fn %{cluster: cluster, store: %{id: id}} ->
      cluster
      |> Ecto.Changeset.change(%{object_store_id: id})
      |> Repo.update()
    end)
    |> add_operation(:repo, fn _ -> Services.ensure_console_repo(user) end)
    |> add_operation(:svc, fn %{cluster: %{id: cluster_id}, repo: repo, store: store} ->
      upsert_service(cluster_id, repo, store, user)
    end)
    |> execute(extract: :update)
  end

  @doc """
  Delete backup configuration from a cluster
  """
  @spec delink_backups(binary, User.t) :: Clusters.cluster_resp
  def delink_backups(cluster_id, %User{} = user) do
    start_transaction()
    |> add_operation(:cluster, fn _ ->
      Clusters.get_cluster!(cluster_id)
      |> Ecto.Changeset.change(%{object_store_id: nil})
      |> allow(user, :write)
      |> when_ok(:update)
    end)
    |> add_operation(:svc, fn %{cluster: %{id: id}} ->
      svc = Services.get_service_by_name!(id, "velero")
      Services.delete_service(svc.id, user)
    end)
    |> execute(extract: :cluster)
  end

  defp upsert_service(cluster_id, repo, store, user) do
    config = ObjectStore.configuration(store)
             |> Enum.map(fn {k, v} -> %{name: k, value: v} end)
    case Services.get_service_by_name(cluster_id, "velero") do
      %Service{id: id} -> Services.merge_service(config, id, tmp_admin(user))
      nil -> Services.create_service(%{
        repository_id: repo.id,
        name: "velero",
        protect: true,
        namespace: "velero",
        configuration: config,
        git: %{ref: "master", folder: "charts/velero"},
      }, cluster_id, tmp_admin(user))
    end
  end

  defp tmp_admin(%User{} = user), do: %{user | roles: %{admin: true}}

  defp notify({:ok, %ObjectStore{} = store}, :create, user),
    do: handle_notify(PubSub.ObjectStoreCreated, store, actor: user)
  defp notify({:ok, %ObjectStore{} = store}, :update, user),
    do: handle_notify(PubSub.ObjectStoreUpdated, store, actor: user)
  defp notify({:ok, %ObjectStore{} = store}, :delete, user),
    do: handle_notify(PubSub.ObjectStoreDeleted, store, actor: user)

  defp notify({:ok, %ClusterRestore{} = restore}, :create, user),
    do: handle_notify(PubSub.ClusterRestoreCreated, restore, actor: user)

  defp notify(pass, _, _), do: pass
end
