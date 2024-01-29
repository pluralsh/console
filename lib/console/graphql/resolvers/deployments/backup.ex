defmodule Console.GraphQl.Resolvers.Deployments.Backup do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.Backups
  alias Console.Schema.ObjectStore

  def list_object_stores(args, _) do
    ObjectStore.ordered()
    |> paginate(args)
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
end
