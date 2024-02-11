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
end
