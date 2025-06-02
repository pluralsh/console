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
      assert global.cascade.delete

      [tag] = global.tags
      assert tag.name == "name"
      assert tag.value == "value"

      assert_receive {:event, %PubSub.GlobalServiceCreated{item: ^global}}
    end

    test "it can create template global services" do
      git = insert(:git_repository)

      {:ok, global} = Global.create(%{
        name: "templated",
        template: %{
          repository_id: git.id,
          git: %{ref: "main", folder: "k8s"},
          sync_config: %{create_namespace: false},
          name: "svc",
          namespace: "prod"
        }
      }, admin_user())

      assert global.name == "templated"
      assert global.template.repository_id == git.id
      assert global.template.git.ref == "main"
      assert global.template.git.folder == "k8s"
    end

    test "project writers can create project-scoped global services" do
      user = insert(:user)
      svc = insert(:service)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, global} = Global.create(%{
        name: "test",
        project_id: project.id,
        tags: [%{name: "name", value: "value"}]
      }, svc.id, user)

      assert global.service_id == svc.id
      assert global.project_id == project.id
      [tag] = global.tags
      assert tag.name == "name"
      assert tag.value == "value"

      assert_receive {:event, %PubSub.GlobalServiceCreated{item: ^global}}
    end

    test "it can create a template global service" do
      git = insert(:git_repository)
      {:ok, global} = Global.create(%{
        name: "templated",
        template: %{
          repository_id: git.id,
          git: %{ref: "main", folder: "k8s"},
        }
      }, admin_user())

      assert global.name == "templated"

      {:ok, deleted} = Global.delete(global.id, admin_user())

      assert deleted.id == global.id
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

    test "if cascade.delete is true, will drain all owned services" do
      global = insert(:global_service, cascade: %{delete: true})
      svc = insert(:service, owner: global)

      {:ok, deleted} = Global.delete(global.id, admin_user())

      assert deleted.id == global.id
      assert refetch(svc).deleted_at
      refute refetch(global)

      assert_receive {:event, %PubSub.GlobalServiceDeleted{item: ^deleted}}
    end

    test "if cascade.detach is true, will detach all owned services" do
      global = insert(:global_service, cascade: %{detach: true})
      svc = insert(:service, owner: global)

      {:ok, deleted} = Global.delete(global.id, admin_user())

      assert deleted.id == global.id
      refute refetch(svc)
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
        configuration: [%{name: "name", value: "value"}],
        dependencies: [%{name: "cert-manager"}]
      }, insert(:cluster), admin)

      {:ok, dest} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "master", folder: "k8s"},
        configuration: [%{name: "name2", value: "value"}],
      }, insert(:cluster), admin)

      {:ok, synced} = Global.sync_service(source, dest, admin)

      assert synced.name == "source"
      assert synced.namespace == "my-service"
      assert synced.git.ref == "main"
      assert synced.git.folder == "k8s"
      assert synced.repository_id == git.id

      [dep] = synced.dependencies
      assert dep.name == "cert-manager"

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
        configuration: [%{name: "name", value: "value"}],
        dependencies: [%{name: "cert-manager"}]
      }, insert(:cluster), admin)

      {:ok, %{id: id} = dest} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}],
        dependencies: [%{name: "cert-manager"}]
      }, insert(:cluster), admin)

      %{id: ^id} = Global.sync_service(source, dest, admin)
    end

    test "it can sync a template global service" do
      git = insert(:git_repository)
      global = insert(:global_service,
        template: %{repository_id: git.id, git: %{ref: "main", folder: "/"}, name: "svc", namespace: "prod"})
      service = insert(:service, name: "svc", namespace: "prod", git: %{ref: "master", folder: "/k8s"})

      {:ok, synced} = Global.sync_service(global, refetch(service), admin_user())

      assert synced.id == service.id
      assert synced.repository_id == git.id
      assert synced.git.ref == "main"
      assert synced.git.folder == "/"
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

  describe "#diff/2" do
    test "it returns false if targets have all the same relevant config" do
      svc = insert(:service,
        helm: %{chart: "test", version: "0.4.0", repository: %{name: "chart", namespace: "infra"}},
        templated: true,
        protect: false,
        namespace: "test"
      )

      template = insert(:service_template,
        repository: svc.repository,
        helm: %{chart: "test", version: "0.4.0", repository: %{name: "chart", namespace: "infra"}},
        templated: true,
        git: svc.git,
        namespace: "test"
      )

      refute Global.diff?(template, Console.Repo.preload(svc, [:contexts]))
    end
  end
end

defmodule Console.Deployments.GlobalSyncTest do
  use Console.DataCase, async: false
  alias Console.Deployments.{Global, Services}

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

      global = insert(:global_service,
        service: source,
        provider: cluster.provider,
        tags: [%{name: "sync", value: "test"}],
        cascade: %{delete: true}
      )
      sync = insert(:cluster, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      sync2 = insert(:cluster, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      ignore1 = insert(:cluster, provider: cluster.provider)
      ignore2 = insert(:cluster, tags: [%{name: "sync", value: "test"}])
      svc = insert(:service, owner: global, cluster: ignore1)
      keep = insert(:service, name: "source", owner: global, cluster: sync2)

      :ok = Global.sync_clusters(global)

      refute Services.get_service_by_name(ignore1.id, "source")
      refute Services.get_service_by_name(ignore2.id, "source")

      synced = Services.get_service_by_name(sync.id, "source")
      refute Global.diff?(source, synced)

      keep = refetch(keep)
      refute keep.deleted_at
      refute Global.diff?(source, keep)

      assert refetch(svc).deleted_at

      :ok = Global.sync_clusters(global)

      for cluster <- [sync, sync2] do
        synced = Services.get_service_by_name(cluster.id, "source")
        refute Global.diff?(source, synced)
        refute synced.deleted_at
      end
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

    test "it will reparent legacy services when present" do
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

      global = insert(:global_service, reparent: true, service: source, distro: :eks, tags: [%{name: "sync", value: "test"}])
      sync = insert(:cluster, distro: :eks, tags: [%{name: "sync", value: "test"}])
      ignore1 = insert(:cluster, distro: :eks)
      ignore2 = insert(:cluster, distro: :k3s, tags: [%{name: "sync", value: "test"}])

      {:ok, legacy} = create_service(%{
        name: "source",
        namespace: "my-service",
        repository_id: git.id,
        git: %{ref: "main", folder: "wrong"},
        configuration: [%{name: "name", value: "value"}]
      }, sync, admin)

      :ok = Global.sync_clusters(global)

      refute Services.get_service_by_name(ignore1.id, "source")
      refute Services.get_service_by_name(ignore2.id, "source")

      synced = Services.get_service_by_name(sync.id, "source")
      assert synced.id == legacy.id
      assert synced.owner_id == global.id
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

    test "it can sync template global services" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      git = insert(:git_repository)
      cluster = insert(:cluster)

      global = insert(:global_service,
        template: build(:service_template,
          repository_id: git.id,
          name: "source",
          namespace: "my-service",
          git: %{ref: "main", folder: "k8s"},
          configuration: [%{name: "name", value: "value"}]
        ),
        cascade: %{delete: true},
        tags: [%{name: "sync", value: "test"}]
      )
      sync = insert(:cluster, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      sync2 = insert(:cluster, provider: cluster.provider)
      sync3 = insert(:cluster, tags: [%{name: "sync", value: "test2"}])

      :ok = Global.sync_clusters(global)

      svc = Services.get_service_by_name(sync.id, "source")

      assert svc.git.ref == "main"
      assert svc.git.folder == "k8s"
      assert svc.namespace == "my-service"
      assert svc.owner_id == global.id

      for cluster <- [sync2, sync3] do
        refute Services.get_service_by_name(cluster.id, "source")
      end

      :ok = Global.sync_clusters(global)

      svc = Services.get_service_by_name(sync.id, "source")

      assert svc.git.ref == "main"
      assert svc.git.folder == "k8s"
      assert svc.namespace == "my-service"
      assert svc.owner_id == global.id
      refute svc.deleted_at
    end

    test "it can sync template global services with dynamic template overrides" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      git = insert(:git_repository)
      cluster = insert(:cluster)

      sync = insert(:cluster, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      another_sync = insert(:cluster, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      sync2 = insert(:cluster, provider: cluster.provider)
      sync3 = insert(:cluster, tags: [%{name: "sync", value: "test2"}])

      global = insert(:global_service,
        template: build(:service_template,
          repository_id: git.id,
          name: "source",
          namespace: "my-service",
          git: %{ref: "main", folder: ~s({{ context[cluster.handle].folder | default: "k8s" }})},
          configuration: [%{name: "name", value: "value"}]
        ),
        cascade: %{delete: true},
        context: build(:template_context, raw: %{sync.handle => %{"folder" => "k8s-special"}}),
        tags: [%{name: "sync", value: "test"}]
      )


      :ok = Global.sync_clusters(global)

      svc = Services.get_service_by_name(sync.id, "source")

      assert svc.git.ref == "main"
      assert svc.git.folder == "k8s-special"
      assert svc.namespace == "my-service"
      assert svc.owner_id == global.id

      svc2 = Services.get_service_by_name(another_sync.id, "source")

      assert svc2.git.ref == "main"
      assert svc2.git.folder == "k8s"
      assert svc2.namespace == "my-service"
      assert svc2.owner_id == global.id

      for cluster <- [sync2, sync3] do
        refute Services.get_service_by_name(cluster.id, "source")
      end

      :ok = Global.sync_clusters(global)

      svc = Services.get_service_by_name(sync.id, "source")

      assert svc.git.ref == "main"
      assert svc.git.folder == "k8s-special"
      assert svc.namespace == "my-service"
      assert svc.owner_id == global.id
      refute svc.deleted_at
    end

    test "it can sync template global services with dynamic template overrides and contexts" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      git = insert(:git_repository)
      cluster = insert(:cluster)

      sync = insert(:cluster, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      another_sync = insert(:cluster, provider: cluster.provider, tags: [%{name: "sync", value: "test"}])
      sync2 = insert(:cluster, provider: cluster.provider)
      sync3 = insert(:cluster, tags: [%{name: "sync", value: "test2"}])

      ctx1 = insert(:service_context, name: "ctx1")
      ctx2 = insert(:service_context, name: "ctx2")

      global = insert(:global_service,
        template: build(:service_template,
          repository_id: git.id,
          name: "source",
          contexts: [ctx1.name, ctx2.name],
          namespace: "my-service",
          git: %{ref: "main", folder: ~s({{ context[cluster.handle].folder | default: "k8s" }})},
          configuration: [%{name: "name", value: "value"}]
        ),
        cascade: %{delete: true},
        context: build(:template_context, raw: %{sync.handle => %{"folder" => "k8s-special"}}),
        tags: [%{name: "sync", value: "test"}]
      )

      :ok = Global.sync_clusters(global)

      svc = Services.get_service_by_name(sync.id, "source") |> Console.Repo.preload(:context_bindings)

      assert svc.git.ref == "main"
      assert svc.git.folder == "k8s-special"
      assert svc.namespace == "my-service"
      assert svc.owner_id == global.id
      assert MapSet.new(svc.context_bindings, & &1.context_id)
             |> MapSet.equal?(MapSet.new([ctx1.id, ctx2.id]))

      svc2 = Services.get_service_by_name(another_sync.id, "source") |> Console.Repo.preload(:context_bindings)

      assert svc2.git.ref == "main"
      assert svc2.git.folder == "k8s"
      assert svc2.namespace == "my-service"
      assert svc2.owner_id == global.id
      assert MapSet.new(svc2.context_bindings, & &1.context_id)
             |> MapSet.equal?(MapSet.new([ctx1.id, ctx2.id]))

      for cluster <- [sync2, sync3] do
        refute Services.get_service_by_name(cluster.id, "source")
      end

      :ok = Global.sync_clusters(global)

      svc = Services.get_service_by_name(sync.id, "source")

      assert svc.git.ref == "main"
      assert svc.git.folder == "k8s-special"
      assert svc.namespace == "my-service"
      assert svc.owner_id == global.id
      refute svc.deleted_at
    end
  end
end
