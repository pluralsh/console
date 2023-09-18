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

      assert_receive {:event, %PubSub.ServiceComponentsUpdated{item: ^service}}
    end
  end
end
