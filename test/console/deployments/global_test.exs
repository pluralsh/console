defmodule Console.Deployments.GlobalTest do
  use Console.DataCase, async: true
  alias Console.PubSub
  alias Console.Deployments.{Global, Services}

  describe "#create/3" do
    test "it can create a new global service record" do
      user = admin_user()
      svc = insert(:service)

      {:ok, global} = Global.create(%{name: "test", tags: [%{name: "name", value: "value"}]}, svc.id, user)

      assert global.service_id == svc.id
      [tag] = global.tags
      assert tag.name == "name"
      assert tag.value == "value"

      assert_receive {:event, %PubSub.GlobalServiceCreated{item: ^global}}
    end
  end

  describe "#delete/2" do
    test "it can delete a global service and wipe ownership pointers" do
      global = insert(:global_service)
      svc = insert(:service, owner: global)

      {:ok, deleted} = Global.delete(global.id, admin_user())

      assert deleted.id == global.id
      refute refetch(svc).owner_id
      refute refetch(global)

      assert_receive {:event, %PubSub.GlobalServiceDeleted{item: ^deleted}}
    end
  end

  describe "#sync_service/3" do
    test "if there's a difference between the services they will sync" do
      git = insert(:git_repository)
      admin = admin_user()

      {:ok, source} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, insert(:cluster), admin)

      {:ok, dest} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "master", folder: "k8s"},
        configuration: [%{name: "name2", value: "value"}]
      }, insert(:cluster), admin)

      {:ok, synced} = Global.sync_service(source, dest, admin)

      assert synced.name == "source"
      assert synced.namespace == "my-service"
      assert synced.git.ref == "main"
      assert synced.git.folder == "k8s"
      assert synced.repository_id == git.id

      {:ok, secrets} = Services.configuration(synced)
      assert secrets["name"] == "value"
    end

    test "if there's no difference they won't sync" do
      git = insert(:git_repository)
      admin = admin_user()

      {:ok, source} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, insert(:cluster), admin)

      {:ok, dest} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, insert(:cluster), admin)

      :ok = Global.sync_service(source, dest, admin)
    end
  end

  describe "#sync_clusters/1" do
    test "it will sync to all targeted clusters" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      git = insert(:git_repository)
      cluster = insert(:cluster)
      admin = admin_user()

      {:ok, source} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, cluster, admin)

      global = insert(:global_service, service: source, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      sync = insert(:cluster, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      ignore1 = insert(:cluster, provider: cluster.provider)
      ignore2 = insert(:cluster, tags: [%{name: "sync", value: "test"}])

      :ok = Global.sync_clusters(global)

      refute Services.get_service_by_name(ignore1.id, "source")
      refute Services.get_service_by_name(ignore2.id, "source")

      synced = Services.get_service_by_name(sync.id, "source")
      refute Global.diff?(source, synced)
    end

    test "it will sync by distro" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      git = insert(:git_repository)
      cluster = insert(:cluster)
      admin = admin_user()

      {:ok, source} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, cluster, admin)

      global = insert(:global_service, service: source, distro: :eks, tags: [%{name: "sync", value: "test"}])
      sync = insert(:cluster, distro: :eks, tags: [%{name: "sync", value: "test"}])
      ignore1 = insert(:cluster, distro: :eks)
      ignore2 = insert(:cluster, distro: :k3s, tags: [%{name: "sync", value: "test"}])

      :ok = Global.sync_clusters(global)

      refute Services.get_service_by_name(ignore1.id, "source")
      refute Services.get_service_by_name(ignore2.id, "source")

      synced = Services.get_service_by_name(sync.id, "source")
      refute Global.diff?(source, synced)
    end

    test "it will sync to if provider is unspecified" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      git = insert(:git_repository)
      cluster = insert(:cluster)
      admin = admin_user()

      {:ok, source} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, cluster, admin)

      global = insert(:global_service, service: source)
      sync = insert(:cluster, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      sync2 = insert(:cluster, provider: cluster.provider)
      sync3 = insert(:cluster, tags: [%{name: "sync", value: "test"}])

      :ok = Global.sync_clusters(global)

      for cluster <- [sync, sync2, sync3] do
        synced = Services.get_service_by_name(cluster.id, "source")
        refute Global.diff?(source, synced)
      end
    end

    test "it will sync on tags if provider is unspecified but tags are" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      git = insert(:git_repository)
      cluster = insert(:cluster)
      admin = admin_user()

      {:ok, source} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, cluster, admin)

      global = insert(:global_service, service: source, tags: [%{name: "sync", value: "test"}])
      sync = insert(:cluster, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      sync2 = insert(:cluster, provider: cluster.provider)
      sync3 = insert(:cluster, tags: [%{name: "sync", value: "test2"}])

      :ok = Global.sync_clusters(global)

      synced = Services.get_service_by_name(sync.id, "source")
      refute Global.diff?(source, synced)
      for cluster <- [sync2, sync3] do
        refute Services.get_service_by_name(cluster.id, "source")
      end
    end
  end
end
