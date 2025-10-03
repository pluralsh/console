defmodule Console.GraphQl.Deployments.ServicesMutationsTest do
  use Console.DataCase, async: true
  use Mimic

  describe "createServiceDeployment" do
    test "it can create a new service" do
      cluster = insert(:cluster)
      user = admin_user()
      git = insert(:git_repository)
      expect(Console.Features, :available?, fn :cd -> true end)

      {:ok, %{data: %{"createServiceDeployment" => service}}} = run_query("""
        mutation Create($clusterId: ID!, $attributes: ServiceDeploymentAttributes!) {
          createServiceDeployment(clusterId: $clusterId, attributes: $attributes) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
          }
        }
      """, %{
        "attributes" => %{
          "name" => "test",
          "namespace" => "test",
          "git" => %{"ref" => "master", "folder" => "k8s"},
          "repositoryId" => git.id,
          "configuration" => [%{"name" => "name", "value" => "value"}],
        },
        "clusterId" => cluster.id,
      }, %{current_user: user})

      assert service["name"] == "test"
      assert service["namespace"] == "test"
      assert service["git"]["ref"] == "master"
      assert service["git"]["folder"] == "k8s"
      assert service["repository"]["id"] == git.id

      [conf] = service["configuration"]
      assert conf["name"] == "name"
      assert conf["value"] == "value"
    end

    test "it can handle invalid configuration" do
      cluster = insert(:cluster)
      user = admin_user()
      git = insert(:git_repository)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Create($clusterId: ID!, $attributes: ServiceDeploymentAttributes!) {
          createServiceDeployment(clusterId: $clusterId, attributes: $attributes) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
          }
        }
      """, %{
        "attributes" => %{
          "name" => "test",
          "namespace" => "test",
          "git" => %{"ref" => "master", "folder" => "k8s"},
          "repositoryId" => git.id,
          "configuration" => [%{"name" => "", "value" => ""}],
        },
        "clusterId" => cluster.id,
      }, %{current_user: user})
    end

    test "it can create a new service by handle" do
      cluster = insert(:cluster, handle: "test")
      user = admin_user()
      git = insert(:git_repository)
      expect(Console.Features, :available?, fn :cd -> true end)

      {:ok, %{data: %{"createServiceDeployment" => service}}} = run_query("""
        mutation Create($cluster: String!, $attributes: ServiceDeploymentAttributes!) {
          createServiceDeployment(cluster: $cluster, attributes: $attributes) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
          }
        }
      """, %{
        "attributes" => %{
          "name" => "test",
          "namespace" => "test",
          "git" => %{"ref" => "master", "folder" => "k8s"},
          "repositoryId" => git.id,
          "configuration" => [%{"name" => "name", "value" => "value"}],
        },
        "cluster" => cluster.handle,
      }, %{current_user: user})

      assert service["name"] == "test"
      assert service["namespace"] == "test"
      assert service["git"]["ref"] == "master"
      assert service["git"]["folder"] == "k8s"
      assert service["repository"]["id"] == git.id

      [conf] = service["configuration"]
      assert conf["name"] == "name"
      assert conf["value"] == "value"
    end
  end

  describe "updateServiceDeployment" do
    test "updates the service" do
      expect(Console.Features, :available?, fn :cd -> true end)
      cluster = insert(:cluster)
      user = admin_user()
      git = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git_ref: %{ref: "master", folder: "k8s"},
        repository_id: git.id,
        configuration: [%{name: "name", value: "value"}]
      ])

      {:ok, %{data: %{"updateServiceDeployment" => updated}}} = run_query("""
        mutation update($id: ID!, $attributes: ServiceUpdateAttributes!) {
          updateServiceDeployment(id: $id, attributes: $attributes) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
            dependencies { name }
            editable
          }
        }
      """, %{
        "attributes" => %{
          "git" => %{"ref" => "main", "folder" => "k8s"},
          "dependencies" => [%{"name" => "deploy-operator"}, %{"name" => "rbac"}],
          "configuration" => [%{"name" => "new-name", "value" => "new-value"}],
        },
        "id" => service.id,
      }, %{current_user: user})

      assert updated["git"]["ref"] == "main"
      assert updated["git"]["folder"] == "k8s"
      assert updated["repository"]["id"] == git.id
      assert updated["editable"]

      [conf] = updated["configuration"]
      assert conf["name"] == "new-name"
      assert conf["value"] == "new-value"

      assert Enum.map(updated["dependencies"], & &1["name"])
             |> Enum.sort() == ["deploy-operator", "rbac"]
    end

    test "updates the service by handle" do
      cluster = insert(:cluster, handle: "test")
      user = admin_user()
      git = insert(:git_repository)
      expect(Console.Features, :available?, fn :cd -> true end)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git_ref: %{ref: "master", folder: "k8s"},
        repository_id: git.id,
        configuration: [%{name: "name", value: "value"}]
      ])

      {:ok, %{data: %{"updateServiceDeployment" => updated}}} = run_query("""
        mutation update($cluster: String!, $name: String!, $attributes: ServiceUpdateAttributes!) {
          updateServiceDeployment(cluster: $cluster, name: $name, attributes: $attributes) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
            editable
          }
        }
      """, %{
        "attributes" => %{
          "git" => %{"ref" => "main", "folder" => "k8s"},
          "configuration" => [%{"name" => "new-name", "value" => "new-value"}],
        },
        "cluster" => cluster.handle,
        "name" => service.name,
      }, %{current_user: user})

      assert updated["git"]["ref"] == "main"
      assert updated["git"]["folder"] == "k8s"
      assert updated["repository"]["id"] == git.id
      assert updated["editable"]

      [conf] = updated["configuration"]
      assert conf["name"] == "new-name"
      assert conf["value"] == "new-value"
    end

    @tag :skip
    test "enforces scopes" do
      cluster = insert(:cluster, handle: "test")
      user = admin_user()
      git = insert(:git_repository)
      expect(Console.Features, :available?, 2, fn :cd -> true end)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git_ref: %{ref: "master", folder: "k8s"},
        repository_id: git.id,
        configuration: [%{name: "name", value: "value"}]
      ])

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation update($cluster: String!, $name: String!, $attributes: ServiceUpdateAttributes!) {
          updateServiceDeployment(cluster: $cluster, name: $name, attributes: $attributes) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
            editable
          }
        }
      """, %{
        "attributes" => %{
          "git" => %{"ref" => "main", "folder" => "k8s"},
          "configuration" => [%{"name" => "new-name", "value" => "new-value"}],
        },
        "cluster" => cluster.handle,
        "name" => service.name,
      }, %{current_user: %{user | scopes: [build(:scope, api: "updateServiceDeployment", identifier: insert(:service).id)]}})

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation update($cluster: String!, $name: String!, $attributes: ServiceUpdateAttributes!) {
          updateServiceDeployment(cluster: $cluster, name: $name, attributes: $attributes) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
            editable
          }
        }
      """, %{
        "attributes" => %{
          "git" => %{"ref" => "main", "folder" => "k8s"},
          "configuration" => [%{"name" => "new-name", "value" => "new-value"}],
        },
        "cluster" => cluster.handle,
        "name" => service.name,
      }, %{current_user: %{user | scopes: [build(:scope, api: "cluster")]}})

      {:ok, %{data: %{"updateServiceDeployment" => updated}}} = run_query("""
        mutation update($cluster: String!, $name: String!, $attributes: ServiceUpdateAttributes!) {
          updateServiceDeployment(cluster: $cluster, name: $name, attributes: $attributes) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
            editable
          }
        }
      """, %{
        "attributes" => %{
          "git" => %{"ref" => "main", "folder" => "k8s"},
          "configuration" => [%{"name" => "new-name", "value" => "new-value"}],
        },
        "cluster" => cluster.handle,
        "name" => service.name,
      }, %{current_user: %{user | scopes: [build(:scope, api: "updateServiceDeployment", identifier: service.id)]}})

      assert updated["git"]["ref"] == "main"
      assert updated["git"]["folder"] == "k8s"
      assert updated["repository"]["id"] == git.id
      assert updated["editable"]

      [conf] = updated["configuration"]
      assert conf["name"] == "new-name"
      assert conf["value"] == "new-value"
    end
  end

  describe "cloneService" do
    test "it will clone a service" do
      user = insert(:user)
      git = insert(:git_repository)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      other = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, service} = create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}, %{name: "name2", value: "value2"}]
      }, other, user)

      {:ok, %{data: %{"cloneService" => clone}}} = run_query("""
          mutation Clone($cid: ID!, $sid: ID!, $attrs: ServiceCloneAttributes!) {
            cloneService(clusterId: $cid, serviceId: $sid, attributes: $attrs) {
              cluster { id }
              git { ref folder }
              name
              configuration { name value }
            }
          }
      """, %{"sid" => service.id, "cid" => cluster.id, "attrs" => %{
        "name" => "clone",
        "configuration" => [%{"name" => "name", "value" => "overwrite"}]
      }}, %{current_user: user})

      assert clone["name"] == "clone"
      assert clone["cluster"]["id"] == cluster.id
      assert clone["git"]["ref"] == "main"
      assert clone["git"]["folder"] == "k8s"

      secrets = Map.new(clone["configuration"], & {&1["name"], &1["value"]})
      assert secrets["name"] == "overwrite"
      assert secrets["name2"] == "value2"

      {:ok, %{data: %{"cloneService" => clone}}} = run_query("""
          mutation Clone($cid: ID!, $cluster: String!, $name: String!, $attrs: ServiceCloneAttributes!) {
            cloneService(clusterId: $cid, cluster: $cluster, name: $name, attributes: $attrs) {
              cluster { id }
              git { ref folder }
              name
              configuration { name value }
            }
          }
      """, %{
        "cluster" => other.handle,
        "name" => service.name,
        "cid" => cluster.id,
        "attrs" => %{
          "name" => "clone2",
          "configuration" => [%{"name" => "name", "value" => "overwrite"}]
        }
      }, %{current_user: user})

      assert clone["name"] == "clone2"
      assert clone["cluster"]["id"] == cluster.id
      assert clone["git"]["ref"] == "main"
      assert clone["git"]["folder"] == "k8s"
    end
  end

  describe "mergeService" do
    test "it can merge configuration for a service" do
      user = insert(:user)
      git = insert(:git_repository)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, svc} = create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}, %{name: "name2", value: "value2"}]
      }, cluster, user)

      {:ok, %{data: %{"mergeService" => merged}}} = run_query("""
        mutation Merge($id: ID!, $config: [ConfigAttributes]) {
          mergeService(id: $id, configuration: $config) {
            id
            configuration { name value }
          }
        }
      """, %{"id" => svc.id, "config" => [%{"name" => "name", "value" => "overwrite"}]}, %{current_user: user})

      assert merged["id"] == svc.id
      %{"name" => v} = Map.new(merged["configuration"], & {&1["name"], &1["value"]})
      assert v == "overwrite"
    end
  end

  describe "rollbackService" do
    test "it can rollback a service to a prior revision" do
      cluster = insert(:cluster, handle: "test")
      user = admin_user()
      git = insert(:git_repository)

      {:ok, service} = create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{
          ref: "main",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "value"}]
      }, cluster, user)

      {:ok, _} = update_service(%{
        git: %{
          ref: "master",
          folder: "k8s"
        },
        configuration: [%{name: "name", value: "other-value"}, %{name: "name2", value: "value"}]
      }, service, user)

      {:ok, %{data: %{"rollbackService" => svc}}} = run_query("""
        mutation Rollback($id: ID!, $rev: ID!) {
          rollbackService(id: $id, revisionId: $rev) {
            id
            revision { id }
          }
        }
      """, %{"id" => service.id, "rev" => service.revision_id}, %{current_user: user})

      assert svc["id"] == service.id
      assert svc["revision"]["id"] == service.revision_id

      {:ok, %{data: %{"rollbackService" => svc}}} = run_query("""
        mutation Rollback($cluster: String!, $name: String!, $rev: ID!) {
          rollbackService(cluster: $cluster, name: $name, revisionId: $rev) {
            id
            revision { id }
          }
        }
      """, %{"cluster" => cluster.handle, "name" => service.name, "rev" => service.revision_id}, %{current_user: user})

      assert svc["id"] == service.id
      assert svc["revision"]["id"] == service.revision_id
    end
  end

  describe "deleteServiceDeployment" do
    test "it can mark a cluster for deletion" do
      user = insert(:user)
      service = insert(:service, write_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"deleteServiceDeployment" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteServiceDeployment(id: $id) {
            id
            deletedAt
            configuration { name value }
          }
        }
      """, %{"id" => service.id}, %{current_user: user})

      assert deleted["id"] == service.id
      assert deleted["deletedAt"]
    end

    test "it will fail gracefully if the service deployment was already deleted" do
      user = insert(:user)
      insert(:service, write_bindings: [%{user_id: user.id}])

      {:ok, %{errors: [%{message: msg}]}} = run_query("""
        mutation Delete($id: ID!) {
          deleteServiceDeployment(id: $id) { id deletedAt }
        }
      """, %{"id" => Ecto.UUID.generate()}, %{current_user: user})

      assert msg == "could not find resource"
    end
  end

  describe "detachServiceDeployment" do
    test "it can mark a cluster for deletion" do
      user = insert(:user)
      service = insert(:service, write_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"detachServiceDeployment" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          detachServiceDeployment(id: $id) {
            id
            deletedAt
          }
        }
      """, %{"id" => service.id}, %{current_user: user})

      assert deleted["id"] == service.id
      refute refetch(service)
    end
  end

  describe "updateServiceComponents" do
    test "it will post updates to the components of the service in a cluster" do
      cluster = insert(:cluster)
      service = insert(:service, cluster: cluster)
      attrs = %{
        "name" => "name",
        "namespace" => "namespace",
        "group" => "networking.k8s.io",
        "version" => "v1",
        "kind" => "ingress",
        "synced" => true,
        "state" => "RUNNING"
      }

      {:ok, %{data: %{"updateServiceComponents" => svc}}} = run_query("""
        mutation Update($components: [ComponentAttributes], $id: ID!) {
          updateServiceComponents(id: $id, components: $components) {
            id
            components { name kind namespace group version kind synced state }
          }
        }
      """, %{"id" => service.id, "components" => [attrs]}, %{cluster: cluster})

      assert svc["id"] == service.id
      [component] = svc["components"]

      for {k, v} <- attrs,
        do: assert component[k] == v
    end

    test "it can update service errors as well" do
      cluster = insert(:cluster)
      service = insert(:service, cluster: cluster)
      attrs = %{
        "name" => "name",
        "namespace" => "namespace",
        "group" => "networking.k8s.io",
        "version" => "v1",
        "kind" => "ingress",
        "synced" => true,
        "state" => "RUNNING"
      }

      {:ok, %{data: %{"updateServiceComponents" => svc}}} = run_query("""
        mutation Update($components: [ComponentAttributes], $errors: [ServiceErrorAttributes], $id: ID!) {
          updateServiceComponents(id: $id, components: $components, errors: $errors) {
            id
            components { name kind namespace group version kind synced state }
            errors { source message }
          }
        }
      """, %{"id" => service.id, "components" => [attrs], "errors" => [%{"source" => "sync", "message" => "wtf"}]}, %{cluster: cluster})

      assert svc["id"] == service.id
      [component] = svc["components"]

      for {k, v} <- attrs,
        do: assert component[k] == v

      [error] = svc["errors"]
      assert error["source"] == "sync"
      assert error["message"] == "wtf"
    end

    test "it can persist service metadata" do
      cluster = insert(:cluster)
      service = insert(:service, cluster: cluster)
      attrs = %{
        "name" => "name",
        "namespace" => "namespace",
        "group" => "networking.k8s.io",
        "version" => "v1",
        "kind" => "ingress",
        "synced" => true,
        "state" => "RUNNING"
      }

      {:ok, %{data: %{"updateServiceComponents" => svc}}} = run_query("""
        mutation Update($components: [ComponentAttributes], $metadata: ServiceMetadataAttributes, $id: ID!) {
          updateServiceComponents(id: $id, components: $components, metadata: $metadata) {
            id
            components { name kind namespace group version kind synced state }
            metadata { images fqdns }
          }
        }
      """, %{"id" => service.id, "components" => [attrs], "metadata" => %{"images" => ["image1", "image2"]}}, %{cluster: cluster})

      assert svc["id"] == service.id
      [component] = svc["components"]

      for {k, v} <- attrs,
        do: assert component[k] == v

      %{"images" => images} = svc["metadata"]
      assert images == ["image1", "image2"]
    end
  end

  describe "proceed" do
    test "it can proceed a service through canary deployment" do
      admin = admin_user()
      svc = insert(:service)

      {:ok, %{data: %{"proceed" => res}}} = run_query("""
        mutation Proceed($id: ID!) {
          proceed(id: $id) { id }
        }
      """, %{"id" => svc.id}, %{current_user: admin})

      assert res["id"] == svc.id
      assert refetch(svc).promotion == :proceed
    end
  end

  describe "saveServiceContext" do
    test "admins can save contexts" do
      {:ok, %{data: %{"saveServiceContext" => ctx}}} = run_query("""
        mutation Save($name: String!, $attributes: ServiceContextAttributes!) {
          saveServiceContext(name: $name, attributes: $attributes) {
            name
            configuration
          }
        }
      """, %{"name" => "my-context", "attributes" => %{
        "configuration" => Jason.encode!(%{"some" => "config"})
      }}, %{current_user: admin_user()})

      assert ctx["name"] == "my-context"
      assert ctx["configuration"]["some"] == "config"
    end
  end

  describe "deleteServiceContext" do
    test "admins can delete service contexts" do
      ctx = insert(:service_context)

      {:ok, %{data: %{"deleteServiceContext" => del}}} = run_query("""
        mutation Del($id: ID!) {
          deleteServiceContext(id: $id) { id }
        }
      """, %{"id" => ctx.id}, %{current_user: admin_user()})

      assert del["id"] == ctx.id

      refute refetch(ctx)
    end
  end

  describe "kickService" do
    test "it will kick a service" do
      service = insert(:service)
      expect(Console.Deployments.Git.Discovery, :kick, fn _ -> :ok end)

      {:ok, %{data: %{"kickService" => svc}}} = run_query("""
        mutation Kick($id: ID!) {
          kickService(serviceId: $id) { id }
        }
      """, %{"id" => service.id}, %{current_user: admin_user()})

      assert svc["id"] == service.id

      assert_receive {:event, %Console.PubSub.ServiceUpdated{}}
    end
  end

  describe "setupRenovate" do
    test "it can initialize a renovate cron" do
      insert(:git_repository, url: "https://github.com/pluralsh/scaffolds.git")
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:cluster, self: true)
      scm = insert(:scm_connection)

      {:ok, %{data: %{"setupRenovate" => svc}}} = run_query("""
        mutation Setup($id: ID!, $repos: [String]) {
          setupRenovate(connectionId: $id, repos: $repos) {
            id
          }
        }
      """, %{"id" => scm.id, "repos" => ["some/repo"]}, %{current_user: admin_user()})

      assert svc["id"]
    end
  end

  describe "saveManifests" do
    test "clusters can save manifests" do
      service = insert(:service)

      {:ok, %{data: %{"saveManifests" => true}}} = run_query("""
        mutation Save($manifests: [String], $id: ID!) {
          saveManifests(id: $id, manifests: $manifests)
        }
      """, %{"manifests" => ["testing"], "id" => service.id}, %{cluster: service.cluster})

      # {:ok, ["testing"]} = Console.Deployments.Services.fetch_manifests(service.id, admin_user())
    end

    test "clusters cannot save manifests for services on other clusters" do
      service = insert(:service)

      {:ok, %{errors: [_ | _]}} = run_query("""
        mutation Save($manifests: [String], $id: ID!) {
          saveManifests(id: $id, manifests: $manifests)
        }
      """, %{"manifests" => ["testing"], "id" => service.id}, %{cluster: insert(:cluster)})
    end
  end
end
