defmodule Console.GraphQl.Resolvers.Deployments.Backup do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Backups
  alias Console.Schema.{ObjectStore, ClusterBackup, ClusterRestore}

  def list_object_stores(args, _) do
    ObjectStore.ordered()
    |> paginate(args)
  end

  def list_cluster_backups(%{cluster_id: cid} = args, _) do
    ClusterBackup.for_cluster(cid)
    |> ClusterBackup.ordered()
    |> paginate(args)
  end

  def list_cluster_restores(%{cluster_id: cid} = args, _) do
    ClusterRestore.for_cluster(cid)
    |> ClusterRestore.ordered()
    |> paginate(args)
  end

  def resolve_cluster_restore(%{id: id}, ctx) do
    Backups.get_cluster_restore(id)
    |> allow(actor(ctx), :read)
  end

  def resolve_cluster_backup(%{id: id}, ctx) when is_binary(id) do
    Backups.get_cluster_backup(id)
    |> allow(actor(ctx), :read)
  end
  def resolve_cluster_backup(%{cluster_id: id, namespace: ns, name: n}, ctx) do
    Backups.get_cluster_backup(id, ns, n)
    |> allow(actor(ctx), :read)
  end

  def create_object_store(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Backups.create_object_store(attrs, user)

  def update_object_store(%{attributes: attrs, id: id}, %{context: %{current_user: user}}),
    do: Backups.update_object_store(attrs, id, user)

  def delete_object_store(%{id: id}, %{context: %{current_user: user}}),
    do: Backups.delete_object_store(id, user)

  def create_cluster_backup(%{attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Backups.create_cluster_backup(attrs, cluster)

  def create_cluster_restore(%{backup_id: id}, %{context: %{current_user: user}}),
    do: Backups.create_cluster_restore(id, user)

  def update_cluster_restore(%{id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Backups.update_cluster_restore(attrs, id, cluster)

  def configure_backups(%{store_id: store_id, cluster_id: cluster_id}, %{context: %{current_user: user}}),
    do: Backups.configure_backups(store_id, cluster_id, user)

  def delink_backups(%{cluster_id: cluster_id}, %{context: %{current_user: user}}),
    do: Backups.delink_backups(cluster_id, user)
end
