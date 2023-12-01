defmodule Console.Deployments.ServicesTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.Services

  describe "#create_service/3" do
    test "it can create a new service and initial revision" do
      cluster = insert(:cluster)
      user = admin_user()
      git = insert(:git_repository)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      assert service.name == "my-service"
      assert service.namespace == "my-service"
      assert service.version == "0.0.1"
      assert service.cluster_id == cluster.id
      assert service.repository_id == git.id
      assert service.git.ref == "main"
      assert service.git.folder == "k8s"
      assert service.revision_id
      assert service.status == :stale

      %{revision: revision} = Console.Repo.preload(service, [:revision])
      assert revision.git.ref == service.git.ref
      assert revision.git.folder == service.git.folder

      {:ok, secrets} = Services.configuration(service)

      assert secrets["name"] == "value"

      assert_receive {:event, %PubSub.ServiceCreated{item: ^service}}
    end

    test "it can create a helm-based service and initial revision" do
      cluster = insert(:cluster)
      user = admin_user()

      expect(Kube.Client, :get_helm_repository, fn "helm-charts", "podinfo" -> {:ok, %Kube.HelmRepository{}} end)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        helm: %{
          chart: "podinfo",
          version: "5.0",
          repository: %{namespace: "helm-charts", name: "podinfo"},
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      assert service.name == "my-service"
      assert service.namespace == "my-service"
      assert service.version == "0.0.1"
      assert service.cluster_id == cluster.id
      assert service.helm.chart == "podinfo"
      assert service.helm.version == "5.0"
      assert service.helm.repository.name == "podinfo"
      assert service.status == :stale

      %{revision: revision} = Console.Repo.preload(service, [:revision])
      assert revision.helm.chart == service.helm.chart
      assert revision.helm.version == service.helm.version

      {:ok, secrets} = Services.configuration(service)
      assert secrets["name"] == "value"

      assert_receive {:event, %PubSub.ServiceCreated{item: ^service}}
    end

    test "you cannot create a service in a deleting cluster" do
      cluster = insert(:cluster, deleted_at: Timex.now())
      user = admin_user()
      git = insert(:git_repository)

      {:error, _} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)
    end

    test "it respects rbac" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      git = insert(:git_repository)

      {:ok, _} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      {:error, _} = Services.create_service(%{
        name: "another-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, insert(:user))
    end
  end

  describe "#update_service/3" do
    test "it will create a new revision of the service" do
      cluster = insert(:cluster)
      user = admin_user()
      git = insert(:git_repository)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      {:ok, updated} = Services.update_service(%{
        git: %{
          ref: "master",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "other-value"}, %{name: "name2", value: "value"}]
      }, service.id, user)

      assert_receive {:event, %PubSub.ServiceUpdated{item: ^updated}}

      assert updated.name == "my-service"
      assert updated.namespace == "my-service"
      assert updated.version == "0.0.1"
      assert updated.cluster_id == cluster.id
      assert updated.repository_id == git.id
      assert updated.git.ref == "master"
      assert updated.git.folder == "k8s"
      assert updated.revision_id
      assert updated.status == :stale

      %{revision: revision} = Console.Repo.preload(updated, [:revision])
      assert revision.git.ref == updated.git.ref
      assert revision.git.folder == updated.git.folder

      {:ok, secrets} = Services.configuration(updated)

      assert secrets["name"] == "other-value"
      assert secrets["name2"] == "value"

      [first, second] = Services.revisions(updated)

      assert first.id == revision.id
      assert second.git.ref == "main"
      assert second.git.folder == "k8s"
    end

    test "services still persist correct revisions on sparse updates" do
      cluster = insert(:cluster)
      user = admin_user()
      git = insert(:git_repository)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      {:ok, updated} = Services.update_service(%{
        git: %{
          ref: "master",
        },
        configuration: [%{name: "name", value: "other-value"}, %{name: "name2", value: "value"}]
      }, service.id, user)

      %{revision: revision} = Console.Repo.preload(updated, [:revision])
      assert revision.git.ref == updated.git.ref
      assert revision.git.folder == updated.git.folder
    end

    test "helm services can be updated" do
      cluster = insert(:cluster)
      user = admin_user()
      expect(Kube.Client, :get_helm_repository, fn _, _ -> {:ok, %Kube.HelmRepository{}} end)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        helm: %{
          chart: "chart",
          version: "0.1.0",
          repository: %{namespace: "ns", name: "name"}
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      {:ok, updated} = Services.update_service(%{
        helm: %{
          chart: "chart",
          version: "0.1.1"
        },
      }, service.id, user)

      assert_receive {:event, %PubSub.ServiceUpdated{item: ^updated}}

      assert updated.name == "my-service"
      assert updated.namespace == "my-service"
      assert updated.version == "0.0.1"
      assert updated.helm.chart == "chart"
      assert updated.helm.version == "0.1.1"
      refute updated.git
      assert updated.revision_id
      assert updated.status == :stale

      %{revision: revision} = Console.Repo.preload(updated, [:revision])
      assert revision.helm.chart == updated.helm.chart
      assert revision.helm.version == updated.helm.version
    end

    test "it will respect rbac" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      git = insert(:git_repository)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      {:ok, _} = Services.update_service(%{
        git: %{
          ref: "master",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "other-value"}, %{name: "name2", value: "value"}]
      }, service.id, user)

      {:error, _} = Services.update_service(%{
        git: %{
          ref: "master",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "other-value"}, %{name: "name2", value: "value"}]
      }, service.id, insert(:user))
    end
  end

  describe "#rollback/3" do
    test "it will set the current revision to a previous one" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      git = insert(:git_repository)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      {:ok, _} = Services.update_service(%{
        git: %{
          ref: "master",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "other-value"}, %{name: "name2", value: "value"}]
      }, service.id, user)

      {:ok, rollback} = Services.rollback(service.revision_id, service.id, user)

      assert rollback.revision_id == service.revision_id
      assert rollback.git.ref == "main"
      assert rollback.git.folder == "k8s"
      assert rollback.status == :stale

      {:ok, secrets} = Services.configuration(rollback)
      assert secrets["name"] == "value"

      assert_receive {:event, %PubSub.ServiceUpdated{item: ^rollback}}
    end

    test "it will not allow irrelevant revisions" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      git = insert(:git_repository)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      rev = insert(:revision)

      {:error, _} = Services.rollback(rev.id, service.id, user)
    end

    test "it will respect rbac" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      git = insert(:git_repository)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      {:ok, _} = Services.update_service(%{
        git: %{
          ref: "master",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "other-value"}, %{name: "name2", value: "value"}]
      }, service.id, user)

      {:error, _} = Services.rollback(service.revision_id, service.id, insert(:user))
    end
  end

  describe "#clone_service/2" do
    test "users can clone services" do
      user = insert(:user)
      git = insert(:git_repository)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      other = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, svc} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}, %{name: "name2", value: "value2"}]
      }, other.id, user)


      {:ok, clone} = Services.clone_service(%{
        name: "clone",
        namespace: "clone-namespace",
        configuration: [%{name: "name", value: "overwrite"}]
      }, svc.id, cluster.id, user)

      assert clone.name == "clone"
      assert clone.cluster_id == cluster.id
      assert clone.repository_id == svc.repository_id
      assert clone.git.ref == svc.git.ref
      assert clone.git.folder == svc.git.folder

      {:ok, secrets} = Services.configuration(clone)
      assert secrets["name"] == "overwrite"
      assert secrets["name2"] == "value2"
    end

    test "it respects rbac" do
      user = insert(:user)
      cluster = insert(:cluster)
      git = insert(:git_repository)
      other = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, svc} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}, %{name: "name2", value: "value2"}]
      }, other.id, user)

      {:error, _} = Services.clone_service(%{
        name: "clone",
        namespace: "clone-namespace",
        configuration: [%{name: "name", value: "overwrite"}]
      }, svc.id, cluster.id, user)
    end
  end

  describe "#delete_service/2" do
    test "users can delete services" do
      user = insert(:user)
      svc = insert(:service, write_bindings: [%{user_id: user.id}])

      {:ok, service} = Services.delete_service(svc.id, user)

      assert service.id == svc.id
      assert service.deleted_at

      assert_receive {:event, %PubSub.ServiceDeleted{item: ^service}}
    end

    test "it cannot delete a cluster service" do
      user = insert(:user)
      svc = insert(:service, write_bindings: [%{user_id: user.id}])
      insert(:cluster, service: svc)
      {:error, _} = Services.delete_service(svc.id, user)
    end

    test "it cannot delete a deploy operator" do
      user = insert(:user)
      svc = insert(:service, name: "deploy-operator", write_bindings: [%{user_id: user.id}])
      {:error, _} = Services.delete_service(svc.id, user)
    end

    test "it cannot delete protected services" do
      user = insert(:user)
      svc = insert(:service, protect: true, write_bindings: [%{user_id: user.id}])
      {:error, _} = Services.delete_service(svc.id, user)
    end
  end

  describe "#merge_service/3" do
    test "it can merge config for a service" do
      user = insert(:user)
      git = insert(:git_repository)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, svc} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}, %{name: "name2", value: "value2"}]
      }, cluster.id, user)


      {:ok, merge} = Services.merge_service([
        %{name: "name", value: "overwrite"},
        %{name: "name2", value: nil}
      ], svc.id, user)

      assert merge.id == svc.id
      {:ok, secrets} = Services.configuration(merge)
      assert secrets["name"] == "overwrite"
      refute secrets["name2"]
    end

    test "those without access cannot merge" do
      user = insert(:user)
      git = insert(:git_repository)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, svc} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}, %{name: "name2", value: "value2"}]
      }, cluster.id, user)


      {:error, _} = Services.merge_service([%{name: "name", value: "overwrite"}], svc.id, insert(:user))
    end
  end

  describe "#prune_revisions/1" do
    test "it will prune old revisions" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      git = insert(:git_repository)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      {:ok, other} = Services.create_service(%{
        name: "other-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      to_keep = Console.conf(:revision_history_limit) |> insert_list(:revision, service: service)
      to_kill = insert_list(3, :revision, service: service, inserted_at: Timex.now() |> Timex.shift(hours: -1))

      {:ok, 3} = Services.prune_revisions(service)

      for r <- to_keep,
        do: assert refetch(r)

      for r <- to_kill,
        do: refute refetch(r)

      %{revision: revision} = Console.Repo.preload(other, [:revision])
      assert refetch(other)
      assert refetch(revision)
    end
  end

  describe "#update_sha/3" do
    test "it will update service sha and its base revision" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      git = insert(:git_repository)

      {:ok, service} = Services.create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster.id, user)

      {:ok, svc} = Services.update_sha(service, "test-sha", "commit message")

      assert svc.sha == "test-sha"
      assert svc.message == "commit message"
      %{revision: revision} = Console.Repo.preload(svc, [:revision])
      assert revision.sha == "test-sha"
      assert revision.message == "commit message"
    end
  end

  describe "#self_manage/2" do
    test "admins can convert their byok consoles to self-managed" do
      admin = admin_user()
      settings = deployment_settings(create_bindings: [%{user_id: admin.id}])
      insert(:cluster, self: true)

      {:ok, console} = Services.self_manage("value: bogus", admin)

      assert console.name == "console"
      assert console.namespace == "plrl-console"
      assert console.helm.values == "value: bogus"
      assert console.git.ref == "master"
      assert console.git.folder == "charts/console"
      %{repository: repo} = Console.Repo.preload(console, [:repository])
      assert repo.url == "https://github.com/pluralsh/console.git"

      assert refetch(settings).self_managed
    end
  end

  describe "#update_components/2" do
    test "it will update the k8s components w/in the service" do
      service = insert(:service)

      {:ok, service} = Services.update_components(%{
        errors: [],
        components: [
          %{
            state: :running,
            synced: true,
            group: "networking.k8s.io",
            version: "v1",
            kind: "Ingress",
            namespace: "my-app",
            name: "api"
          },
          %{
            state: :running,
            synced: true,
            group: "networking.k8s.io",
            version: "v1",
            kind: "Ingress",
            namespace: nil,
            name: "api2"
          }
        ]
      }, service)

      %{components: components} = Console.Repo.preload(service, [:components])
      component = Enum.find(components, & &1.name == "api")
      assert component.state == :running
      assert component.synced
      assert component.group == "networking.k8s.io"
      assert component.version == "v1"
      assert component.kind == "Ingress"
      assert component.namespace == "my-app"
      assert component.name == "api"

      svc = refetch(service)
      assert svc.status == :healthy
      assert svc.component_status == "2 / 2"

      assert_receive {:event, %PubSub.ServiceComponentsUpdated{item: ^service}}

      :timer.sleep(:timer.seconds(1))
      {:ok, updated} = Services.update_components(%{
        errors: [],
        components: [
          %{
            state: :running,
            synced: true,
            group: "networking.k8s.io",
            version: "v1",
            kind: "Ingress",
            namespace: nil,
            name: "api2"
          },
          %{
            state: :running,
            synced: true,
            group: "networking.k8s.io",
            version: "v1",
            kind: "Ingress",
            namespace: "my-app",
            name: "api"
          }
        ]
      }, service.id)

      %{components: components} = Console.Repo.preload(updated, [:components])
      updated_component = Enum.find(components, & &1.name == "api")
      assert updated.updated_at == service.updated_at
      assert component.id == updated_component.id
    end

    test "if a component is in error it will flag" do
      service = insert(:service)

      {:ok, service} = Services.update_components(%{
        components: [%{
          state: :failed,
          synced: true,
          group: "networking.k8s.io",
          version: "v1",
          kind: "Ingress",
          namespace: "my-app",
          name: "api"
        }]
      }, service)

      %{components: [component]} = Console.Repo.preload(service, [:components])
      assert component.state == :failed
      assert component.synced
      assert component.group == "networking.k8s.io"
      assert component.version == "v1"
      assert component.kind == "Ingress"
      assert component.namespace == "my-app"
      assert component.name == "api"

      svc = refetch(service)
      assert svc.status == :failed
      assert svc.component_status == "0 / 1"

      assert_receive {:event, %PubSub.ServiceComponentsUpdated{item: ^service}}
    end

    test "if a component is not synced it will remain stale" do
      service = insert(:service)

      {:ok, service} = Services.update_components(%{
        components: [%{
          state: nil,
          synced: false,
          group: "networking.k8s.io",
          version: "v1",
          kind: "Ingress",
          namespace: "my-app",
          name: "api"
        }]
      }, service)

      %{components: [component]} = Console.Repo.preload(service, [:components])
      refute component.synced
      assert component.group == "networking.k8s.io"
      assert component.version == "v1"
      assert component.kind == "Ingress"
      assert component.namespace == "my-app"
      assert component.name == "api"

      svc = refetch(service)
      assert svc.status == :stale
      assert svc.component_status == "0 / 1"

      assert_receive {:event, %PubSub.ServiceComponentsUpdated{item: ^service}}
    end

    test "it will persist errors if passed" do
      service = insert(:service)

      {:ok, service} = Services.update_components(%{
        components: [],
        errors: [%{message: "some error", source: "sync"}]
      }, service)

      %{errors: [error]} = Console.Repo.preload(service, [:errors])
      assert error.message == "some error"
      assert error.source == "sync"
    end

    test "it will persist api deprecations if found" do
      service = insert(:service)

      {:ok, service} = Services.update_components(%{
        components: [%{
          state: :running,
          synced: true,
          group: "extensions",
          version: "v1beta1",
          kind: "Ingress",
          namespace: "my-app",
          name: "api"
        }]
      }, service)

      %{components: [component]} = Console.Repo.preload(service, [components: :api_deprecations])
      assert component.group == "extensions"
      assert component.version == "v1beta1"

      [deprecation] = component.api_deprecations
      assert deprecation.deprecated_in == "v1.14.0"
      assert deprecation.removed_in == "v1.22.0"
      assert deprecation.replacement == "networking.k8s.io/v1"
      assert deprecation.blocking
    end

    test "it will persist deprecations even in the far future" do
      cluster = insert(:cluster, current_version: "1.23.0")
      service = insert(:service, cluster: cluster)

      {:ok, service} = Services.update_components(%{
        components: [%{
          state: :running,
          synced: true,
          group: "batch",
          version: "v1beta1",
          kind: "CronJob",
          namespace: "my-app",
          name: "api"
        }]
      }, service)

      %{components: [component]} = Console.Repo.preload(service, [components: :api_deprecations])
      assert component.group == "batch"
      assert component.version == "v1beta1"

      [deprecation] = component.api_deprecations
      assert deprecation.deprecated_in == "v1.21.0"
      assert deprecation.removed_in == "v1.25.0"
      assert deprecation.replacement == "batch/v1"
      refute deprecation.blocking
    end

    test "it can find non-k8s deprecations" do
      service = insert(:service)

      {:ok, service} = Services.update_components(%{
        components: [%{
          state: :running,
          synced: true,
          group: "cert-manager.io",
          version: "v1beta1",
          kind: "Issuer",
          namespace: "my-app",
          name: "issuer"
        }]
      }, service)

      %{components: [component]} = Console.Repo.preload(service, [components: :api_deprecations])
      assert component.group == "cert-manager.io"
      assert component.version == "v1beta1"

      [deprecation] = component.api_deprecations
      assert deprecation.deprecated_in == "v1.4.0"
      assert deprecation.removed_in == "v1.6.0"
      assert deprecation.replacement == "cert-manager.io/v1"
      refute deprecation.blocking
    end

    test "it will ignore api deprecations if not yet relevant" do
      cluster = insert(:cluster, version: "1.9")
      service = insert(:service, cluster: cluster)

      {:ok, service} = Services.update_components(%{
        components: [%{
          state: :running,
          synced: true,
          group: "extensions",
          version: "v1beta1",
          kind: "Ingress",
          namespace: "my-app",
          name: "api"
        }]
      }, service)

      %{components: [component]} = Console.Repo.preload(service, [components: :api_deprecations])
      assert component.group == "extensions"
      assert component.version == "v1beta1"
      assert component.api_deprecations == []
    end
  end
end

defmodule Console.Deployments.ServicesAsyncTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Deployments.{Services, Tar}

  describe "#docs/1" do
    test "it can fetch the docs for a given service" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      service = insert(:service, repository: git, git: %{ref: "cd-scaffolding", folder: "example"})

      {:ok, [%{path: "test.md", content: content}]} = Services.docs(service)
      assert content == "hello world"
    end
  end

  describe "#tarstream/1" do
    test "it can fetch a chart for a helm service" do
      svc = insert(:service, helm: %{chart: "podinfo", version: "5.0", repository: %{name: "podinfo", namespace: "helm-charts"}})
      name = Console.Deployments.Helm.Charts.chart_name("podinfo", "podinfo", "5.0")
      expect(Kube.Client, :get_helm_chart, fn "helm-charts", ^name -> {:ok, %Kube.HelmChart{
        spec: %Kube.HelmChart.Spec{chart: "podinfo"},
        status: %Kube.HelmChart.Status{
          artifact: %Kube.HelmChart.Status.Artifact{digest: "sha", url: "https://stefanprodan.github.io/podinfo/podinfo-6.5.3.tgz"}
        }
      }} end)

      {:ok, f} = Services.tarstream(svc)
      {:ok, content} = Tar.tar_stream(f)
      content = Map.new(content)
      assert content["Chart.yaml"]

      assert refetch(svc).sha == "sha"
    end

    test "it can splice in a new values.yaml.tpl" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service, helm: %{values: "value: test"}, repository: git, git: %{ref: "master", folder: "charts/console"})

      {:ok, f} = Services.tarstream(svc)
      {:ok, content} = Tar.tar_stream(f)

      content = Map.new(content)
      assert content["Chart.yaml"] =~ "console"
      assert content["values.yaml.liquid"] == "value: test"
    end

    test "it can support multiple sources" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      svc = insert(:service,
        repository: git,
        git: %{ref: "master", folder: "charts/console"},
        helm: %{
          chart: "podinfo",
          version: "5.0",
          repository: %{name: "podinfo", namespace: "helm-charts"},
          values_files: ["values.yaml"]
        }
      )

      name = Console.Deployments.Helm.Charts.chart_name("podinfo", "podinfo", "5.0")
      expect(Kube.Client, :get_helm_chart, fn "helm-charts", ^name -> {:ok, %Kube.HelmChart{
        spec: %Kube.HelmChart.Spec{chart: "podinfo"},
        status: %Kube.HelmChart.Status{
          artifact: %Kube.HelmChart.Status.Artifact{digest: "sha", url: "https://stefanprodan.github.io/podinfo/podinfo-6.5.3.tgz"}
        }
      }} end)

      {:ok, f} = Services.tarstream(svc)
      {:ok, content} = Tar.tar_stream(f)
      content = Map.new(content)

      assert content["values.yaml"] =~ "dkr.plural.sh"
    end
  end
end
