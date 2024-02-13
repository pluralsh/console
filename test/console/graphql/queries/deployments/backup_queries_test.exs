defmodule Console.GraphQl.Deployments.BackupQueriesTest do
  use Console.DataCase, async: true

  describe "objectStores" do
    test "it can list object store connections" do
      stores = insert_list(3, :object_store)

      {:ok, %{data: %{"objectStores" => found}}} = run_query("""
        query {
          objectStores(first: 5) {
            edges { node { id } }
          }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(stores)
    end
  end

  describe "clusterRestore" do
    test "it can fetch a restore by id" do
      restore = insert(:cluster_restore)

      {:ok, %{data: %{"clusterRestore" => found}}} = run_query("""
        query Restore($id: ID!) {
          clusterRestore(id: $id) { id }
        }
      """, %{"id" => restore.id}, %{cluster: restore.backup.cluster})

      assert found["id"] == restore.id
    end

    test "other clusters cannot access restore" do
      restore = insert(:cluster_restore)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Restore($id: ID!) {
          clusterRestore(id: $id) { id }
        }
      """, %{"id" => restore.id}, %{cluster: insert(:cluster)})
    end
  end

  describe "clusterBackup" do
    test "it can fetch a cluster backup by cluster/name/namespace" do
      backup = insert(:cluster_backup)

      {:ok, %{data: %{"clusterBackup" => found}}} = run_query("""
        query Backup($clusterId: ID!, $name: String!, $namespace: String!) {
          clusterBackup(clusterId: $clusterId, name: $name, namespace: $namespace) { id }
        }
      """, %{
        "clusterId" => backup.cluster_id,
        "name" => backup.name,
        "namespace" => backup.namespace
      }, %{current_user: admin_user()})

      assert found["id"] == backup.id
    end
  end

  describe "clusterBackups" do
    test "it can fetch cluster backups for a cluster" do
      cluster = insert(:cluster)
      backups = insert_list(3, :cluster_backup, cluster: cluster)
      insert_list(2, :cluster_backup)

      {:ok, %{data: %{"clusterBackups" => found}}} = run_query("""
        query Backups($id: ID!) {
          clusterBackups(clusterId: $id, first: 5) {
            edges {
              node { id }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(backups)
    end
  end

  describe "clusterRestores" do
    test "it can fetch cluster restores for a cluster" do
      cluster = insert(:cluster)
      restores = insert_list(3, :cluster_restore, backup: insert(:cluster_backup, cluster: cluster))
      insert_list(2, :cluster_restore)

      {:ok, %{data: %{"clusterRestores" => found}}} = run_query("""
        query Restore($id: ID!) {
          clusterRestores(clusterId: $id, first: 5) {
            edges {
              node { id }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: insert(:user)})

      assert from_connection(found)
             |> ids_equal(restores)
    end
  end
end
