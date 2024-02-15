defmodule Console.Deployments.BackupsTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Deployments.{Backups, Services}

  describe "#create_object_store/2" do
    test "admins can create object stores" do
      {:ok, os} = Backups.create_object_store(%{
        name: "store",
        gcs: %{bucket: "my-bucket", region: "us-east1", application_credentials: "blah"}
      }, admin_user())

      assert os.name == "store"
      assert os.gcs.bucket == "my-bucket"
      assert os.gcs.region == "us-east1"
      assert os.gcs.application_credentials == "blah"

      assert_receive {:event, %PubSub.ObjectStoreCreated{item: ^os}}
    end

    test "non-admins cannot create object stores" do
      {:error, _} = Backups.create_object_store(%{
        name: "store",
        gcs: %{bucket: "my-bucket", region: "us-east1", application_credentials: "blah"}
      }, insert(:user))
    end
  end

  describe "#update_object_store/3" do
    test "admins can update object stores" do
      store = insert(:object_store)
      {:ok, os} = Backups.update_object_store(%{
        name: "store",
        gcs: %{bucket: "my-bucket", region: "us-east1", application_credentials: "blah"}
      }, store.id, admin_user())

      assert os.name == "store"
      assert os.gcs.bucket == "my-bucket"
      assert os.gcs.region == "us-east1"
      assert os.gcs.application_credentials == "blah"

      assert_receive {:event, %PubSub.ObjectStoreUpdated{item: ^os}}
    end

    test "non-admins cannot update object stores" do
      store = insert(:object_store)
      {:error, _} = Backups.update_object_store(%{
        name: "store",
        gcs: %{bucket: "my-bucket", region: "us-east1", application_credentials: "blah"}
      }, store.id, insert(:user))
    end
  end

  describe "#delete_object_store/2" do
    test "admins can delete object stores" do
      store = insert(:object_store)
      {:ok, os} = Backups.delete_object_store(store.id, admin_user())

      assert os.id == store.id
      refute refetch(store)

      assert_receive {:event, %PubSub.ObjectStoreDeleted{item: ^os}}
    end

    test "nonadmins cannot delete" do
      store = insert(:object_store)
      {:error, _} = Backups.delete_object_store(store.id, insert(:user))
    end
  end

  describe "#create_cluster_backup/2" do
    test "it can create a backup reference for a cluster" do
      cluster = insert(:cluster)

      {:ok, backup} = Backups.create_cluster_backup(%{name: "backup", namespace: "velero"}, cluster)

      assert backup.name == "backup"
      assert backup.namespace == "velero"
    end
  end

  describe "#create_cluster_restore/2" do
    test "admins can create restores from a cluster backup" do
      backup = insert(:cluster_backup)

      {:ok, restore} = Backups.create_cluster_restore(backup.id, admin_user())

      assert restore.backup_id == backup.id
      assert restore.status == :created

      cluster = refetch(backup.cluster)
      assert cluster.restore_id == restore.id

      [_] = Console.Schema.ClusterRestoreHistory.for_cluster(backup.cluster_id)
            |> Console.Repo.all()

      assert_receive {:event, %PubSub.ClusterRestoreCreated{item: ^restore}}

      # cannot create restores when one is in-progress
      {:error, _} = Backups.create_cluster_restore(backup.id, admin_user())
    end

    test "non-admins cannot initiate restores" do
      backup = insert(:cluster_backup)

      {:error, _} = Backups.create_cluster_restore(backup.id, insert(:user))
    end
  end

  describe "#update_cluster_restore/2" do
    test "it can update the state of a cluster restore object" do
      restore = insert(:cluster_restore)

      {:ok, updated} = Backups.update_cluster_restore(%{status: :successful}, restore.id, restore.backup.cluster)

      assert updated.status == :successful
    end
  end

  describe "#configure_backups/3" do
    test "it can set an object store for cluster backups" do
      store = insert(:object_store, s3: %{bucket: "bucket"})
      cluster = insert(:cluster)

      {:ok, updated} = Backups.configure_backups(store.id, cluster.id, admin_user())

      assert updated.id == cluster.id
      assert updated.object_store_id == store.id

      svc = Services.get_service_by_name(cluster.id, "velero")
      {:ok, config} = Services.configuration(svc)

      assert config["provider"] == "aws"
      assert config["bucket"] == "bucket"
    end
  end

  describe "#delink_backups/2" do
    test "it will remove backup configuration from a cluster" do
      store = insert(:object_store, s3: %{bucket: "bucket"})
      cluster = insert(:cluster, object_store: store)
      svc = insert(:service, cluster: cluster, name: "velero")

      {:ok, updated} = Backups.delink_backups(cluster.id, admin_user())

      assert updated.id == cluster.id
      refute updated.object_store_id

      assert refetch(svc).deleted_at
    end
  end
end
