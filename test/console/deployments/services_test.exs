defmodule Console.Deployments.ServicesTest do
  use Console.DataCase, async: true
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

  describe "#update_components/2" do
    test "it will update the k8s components w/in the service" do
      service = insert(:service)

      {:ok, service} = Services.update_components(%{
        components: [%{
          state: :running,
          synced: true,
          group: "networking.k8s.io",
          version: "v1",
          kind: "Ingress",
          namespace: "my-app",
          name: "api"
        }]
      }, service)

      %{components: [component]} = Console.Repo.preload(service, [:components])
      assert component.state == :running
      assert component.synced
      assert component.group == "networking.k8s.io"
      assert component.version == "v1"
      assert component.kind == "Ingress"
      assert component.namespace == "my-app"
      assert component.name == "api"

      svc = refetch(service)
      assert svc.status == :healthy
      assert svc.component_status == "1 / 1"

      assert_receive {:event, %PubSub.ServiceComponentsUpdated{item: ^service}}
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
  alias Console.Deployments.Services

  describe "#docs/1" do
    test "it can fetch the docs for a given service" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")
      service = insert(:service, repository: git, git: %{ref: "cd-scaffolding", folder: "example"})

      {:ok, [%{path: "test.md", content: content}]} = Services.docs(service)
      assert content == "hello world"
    end
  end
end
