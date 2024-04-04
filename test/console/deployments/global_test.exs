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

  describe "#update/2" do
    test "an admin can update a global service" do
      global = insert(:global_service)

      {:ok, updated} = Global.update(%{distro: :eks}, global.id, admin_user())

      assert updated.distro == :eks

      assert_receive {:event, %PubSub.GlobalServiceUpdated{item: ^updated}}
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

    test "it will sync on helm differences too" do
      git = insert(:git_repository)
      admin = admin_user()

      {:ok, source} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        helm: %{chart: "my-chart", version: "0.1.1"},
        configuration: [%{name: "name", value: "value"}]
      }, insert(:cluster), admin)

      {:ok, dest} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        helm: %{chart: "my-chart", version: "0.1.0"},
        configuration: [%{name: "name", value: "value"}]
      }, insert(:cluster), admin)

      {:ok, synced} = Global.sync_service(source, dest, admin)

      assert synced.name == "source"
      assert synced.namespace == "my-service"
      assert synced.git.ref == "main"
      assert synced.git.folder == "k8s"
      assert synced.helm.version == "0.1.1"
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

    test "it can sync a template global service" do
      git = insert(:git_repository)
      global = insert(:global_service,
        template: %{repository_id: git.id, git: %{ref: "main", folder: "/"}, name: "svc", namespace: "prod"})
      service = insert(:service, name: "svc", namespace: "prod", git: %{ref: "master", folder: "/k8s"})

      {:ok, synced} = Global.sync_service(global, service, admin_user())

      assert synced.id == service.id
      assert synced.repository_id == git.id
      assert synced.git.ref == "main"
      assert synced.git.folder == "/"
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

    test "it will sync too if provider is unspecified" do
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

  describe "#create_managed_namespace/2" do
    test "admins can create managed namespaces" do
      repo = insert(:git_repository)

      {:ok, ns} = Global.create_managed_namespace(%{
        name: "dev",
        labels: %{"some" => "label"},
        service: %{
          repository_id: repo.id,
          git: %{ref: "main", folder: "runtime"},
          configuration: [%{name: "test", value: "secret"}]
        }
      }, admin_user())

      assert ns.name == "dev"
      assert ns.labels["some"] == "label"
      assert ns.service.repository_id == repo.id
      assert ns.service.git.ref == "main"
      assert ns.service.git.folder == "runtime"

      {:ok, %{"test" => "secret"}} = Global.configuration(ns.service)

      assert_receive {:event, %PubSub.ManagedNamespaceCreated{item: ^ns}}
    end

    test "non-admins cannot create" do
      repo = insert(:git_repository)

      {:error, _} = Global.create_managed_namespace(%{
        name: "dev",
        labels: %{"some" => "label"},
        service: %{
          repository_id: repo.id,
          git: %{ref: "main", folder: "runtime"}
        }
      }, insert(:user))
    end
  end

  describe "#update_managed_namespace/3" do
    test "admins can update managed namespaces" do
      repo = insert(:git_repository)
      ns = insert(:managed_namespace)

      {:ok, updated} = Global.update_managed_namespace(%{
        name: "dev",
        labels: %{"some" => "label"},
        service: %{
          repository_id: repo.id,
          git: %{ref: "main", folder: "runtime"}
        }
      }, ns.id, admin_user())

      assert updated.id == ns.id
      assert updated.name == "dev"
      assert updated.labels["some"] == "label"
      assert updated.service.repository_id == repo.id
      assert updated.service.git.ref == "main"
      assert updated.service.git.folder == "runtime"

      assert_receive {:event, %PubSub.ManagedNamespaceUpdated{item: ^updated}}
    end

    test "non-admins cannot update" do
      repo = insert(:git_repository)
      ns = insert(:managed_namespace)

      {:error, _} = Global.update_managed_namespace(%{
        name: "dev",
        labels: %{"some" => "label"},
        service: %{
          repository_id: repo.id,
          git: %{ref: "main", folder: "runtime"}
        }
      }, ns.id, insert(:user))
    end
  end

  describe "#delete_managed_namespace/2" do
    test "admins can delete managed namespaces" do
      ns = insert(:managed_namespace)

      {:ok, deleted} = Global.delete_managed_namespace(ns.id, admin_user())

      assert deleted.id == ns.id
      assert deleted.deleted_at

      assert_receive {:event, %PubSub.ManagedNamespaceDeleted{item: ^deleted}}
    end

    test "non-admins cannot delete" do
      ns = insert(:managed_namespace)

      {:error, _} = Global.delete_managed_namespace(ns.id, insert(:user))
    end
  end
end
