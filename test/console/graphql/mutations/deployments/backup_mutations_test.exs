defmodule Console.GraphQl.Deployments.BackupMutationsTest do
  use Console.DataCase, async: true

  describe "createObjectStore" do
    test "admins can create object stores" do
      {:ok, %{data: %{"createObjectStore" => os}}} = run_query("""
        mutation Create($attributes: ObjectStoreAttributes!) {
          createObjectStore(attributes: $attributes) {
            id
            name
          }
        }
      """, %{"attributes" => %{"name" => "store"}}, %{current_user: admin_user()})

      assert os["name"] == "store"
    end
  end

  describe "updateObjectStore" do
    test "admins can create object stores" do
      store = insert(:object_store)
      {:ok, %{data: %{"updateObjectStore" => os}}} = run_query("""
        mutation Update($id: ID!, $attributes: ObjectStoreAttributes!) {
          updateObjectStore(id: $id, attributes: $attributes) {
            id
            name
          }
        }
      """, %{"id" => store.id, "attributes" => %{"name" => "store"}}, %{current_user: admin_user()})

      assert os["id"] == store.id
      assert os["name"] == "store"
    end
  end

  describe "deleteObjectStore" do
    test "admins can create object stores" do
      store = insert(:object_store)
      {:ok, %{data: %{"deleteObjectStore" => os}}} = run_query("""
        mutation Create($id: ID!) {
          deleteObjectStore(id: $id) { id }
        }
      """, %{"id" => store.id}, %{current_user: admin_user()})

      assert os["id"] == store.id
      refute refetch(store)
    end
  end

  describe "createClusterBackup" do
    test "it can create a backup reference" do
      cluster = insert(:cluster)

      {:ok, %{data: %{"createClusterBackup" => cb}}} = run_query("""
        mutation Create($attributes: BackupAttributes!) {
          createClusterBackup(attributes: $attributes) {
            id
            name
            namespace
            cluster { id }
          }
        }
      """, %{"attributes" => %{"name" => "backup", "namespace" => "velero"}}, %{cluster: cluster})

      assert cb["name"] == "backup"
      assert cb["namespace"] == "velero"
      assert cb["cluster"]["id"] == cluster.id
    end
  end

  describe "createClusterRestore" do
    test "it can create a cluster restore from a backup" do
      backup = insert(:cluster_backup)

      {:ok, %{data: %{"createClusterRestore" => restore}}} = run_query("""
        mutation Create($id: ID!) {
          createClusterRestore(backupId: $id) {
            id
            backup { id }
          }
        }
      """, %{"id" => backup.id}, %{current_user: admin_user()})

      assert restore["backup"]["id"] == backup.id
    end
  end

  describe "updateClusterRestore" do
    test "it can update a restore reference" do
      restore = insert(:cluster_restore)

      {:ok, %{data: %{"updateClusterRestore" => res}}} = run_query("""
        mutation Update($id: ID!, $attributes: RestoreAttributes!) {
          updateClusterRestore(id: $id, attributes: $attributes) {
            id
            status
          }
        }
      """, %{"id" => restore.id, "attributes" => %{"status" => "PENDING"}}, %{cluster: restore.backup.cluster})

      assert res["id"] == restore.id
      assert res["status"] == "PENDING"
    end
  end

  describe "configureBackups" do
    test "it can configure a backup/restore service for the relevant cluster" do
      store = insert(:object_store, s3: %{bucket: "bucket"})
      cluster = insert(:cluster)

      {:ok, %{data: %{"configureBackups" => updated}}} = run_query("""
        mutation Configure($storeId: ID!, $clusterId: ID!) {
          configureBackups(storeId: $storeId, clusterId: $clusterId) {
            id
            objectStore { id }
          }
        }
      """, %{"clusterId" => cluster.id, "storeId" => store.id}, %{current_user: admin_user()})

      assert updated["id"] == cluster.id
      assert updated["objectStore"]["id"] == store.id
    end
  end

  describe "delinkBackups" do
    test "it removes backup configuration for a cluster" do
      store = insert(:object_store, s3: %{bucket: "bucket"})
      cluster = insert(:cluster, object_store: store)
      svc = insert(:service, cluster: cluster, name: "velero")

      {:ok, %{data: %{"delinkBackups" => updated}}} = run_query("""
        mutation Delink($id: ID!) {
          delinkBackups(clusterId: $id) { id }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      assert updated["id"] == cluster.id
      refute refetch(cluster).object_store_id
      assert refetch(svc).deleted_at
    end
  end
end
