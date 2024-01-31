defmodule Console.Deployments.Backups do
  use Console.Services.Base
  import Console.Deployments.Policies
  alias Console.Schema.{
    ClusterBackup,
    ClusterRestore,
    ClusterRestoreHistory,
    ObjectStore,
    Cluster,
    User,
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
  end

  @doc """
  Deletes an object store credential, will cascade to all associated clusters
  """
  @spec delete_object_store(binary, User.t) :: object_store_resp
  def delete_object_store(id, %User{} = user) do
    get_object_store(id)
    |> allow(user, :write)
    |> when_ok(:delete)
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
end
