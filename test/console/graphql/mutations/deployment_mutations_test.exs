defmodule Console.GraphQl.DeploymentMutationsTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Deployments.Clusters

  describe "createGitRepository" do
    test "it will create a new git repo" do
      {:ok, %{data: %{"createGitRepository" => git}}} = run_query("""
        mutation Create($attrs: GitRepositoryAttributes!) {
          createGitRepository(attributes: $attrs) {
            id
            url
          }
        }
      """, %{"attrs" => %{"url" => "https://github.com/pluralsh/console.git"}}, %{current_user: admin_user()})

      assert git["url"] == "https://github.com/pluralsh/console.git"
    end
  end

  describe "createCluster" do
    test "it will create a new cluster" do
      user = admin_user()
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, %{data: %{"createCluster" => cluster}}} = run_query("""
        mutation Create($attributes: ClusterAttributes!) {
          createCluster(attributes: $attributes) {
            name
            version
            deployToken
            provider { name }
            nodePools { id name minSize maxSize instanceType }
          }
        }
      """, %{"attributes" => %{
        "name" => "test",
        "providerId" => provider.id,
        "version" => "1.25",
        "nodePools" => [%{"name" => "pool", "minSize" => 1, "maxSize" => 10, "instanceType" => "t5.large"}]
      }}, %{current_user: user})

      assert cluster["name"] == "test"
      assert cluster["provider"]["name"] == provider.name
      assert cluster["version"] == "1.25"
      assert cluster["deployToken"]

      [node_pool] = cluster["nodePools"]

      assert node_pool["name"] == "pool"
      assert node_pool["minSize"] == 1
      assert node_pool["maxSize"] == 10
      assert node_pool["instanceType"] == "t5.large"
    end
  end

  describe "updateCluster" do
    test "it can update a cluster" do
      user = admin_user()
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      {:ok, %{data: %{"updateCluster" => updated}}} = run_query("""
        mutation Create($id: ID!, $attributes: ClusterUpdateAttributes!) {
          updateCluster(id: $id, attributes: $attributes) {
            id
            version
            nodePools { id name minSize maxSize instanceType }
          }
        }
      """, %{"id" => cluster.id, "attributes" => %{
        "version" => "1.25",
        "nodePools" => [%{"name" => "pool", "minSize" => 2, "maxSize" => 10, "instanceType" => "t5.large"}]
      }}, %{current_user: user})

      assert updated["id"] == cluster.id
      assert updated["version"] == "1.25"
      [pool] = updated["nodePools"]
      assert pool["minSize"] == 2
    end
  end

  describe "pingCluster" do
    test "it can mark a cluster as pinged" do
      cluster = insert(:cluster)

      {:ok, %{data: %{"pingCluster" => pinged}}} = run_query("""
        mutation Ping($ping: ClusterPing!) {
          pingCluster(attributes: $ping) { id pingedAt currentVersion }
        }
      """, %{"ping" => %{"currentVersion" => "1.25"}}, %{cluster: cluster})

      assert pinged["id"] == cluster.id
      assert pinged["currentVersion"] == "1.25"
      assert pinged["pingedAt"]
    end
  end

  describe "deleteCluster" do
    test "it can mark a cluster for deletion" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"deleteCluster" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteCluster(id: $id) { id deletedAt }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert deleted["id"] == cluster.id
      assert deleted["deletedAt"]
    end
  end

  describe "createClusterProvider" do
    test "it can create a new provider" do
      user = insert(:user)
      insert(:cluster, self: true)
      deployment_settings(create_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"createClusterProvider" => created}}} = run_query("""
        mutation create($attrs: ClusterProviderAttributes!) {
          createClusterProvider(attributes: $attrs) { id }
        }
      """, %{"attrs" => %{
        "name" => "aws-sandbox",
        "cloudSettings" => %{"aws" => %{"accessKeyId" => "aid", "secretAccessKey" => "sak"}}
      }}, %{current_user: user})

      assert created["id"]
    end
  end

  describe "updateClusterProvider" do
    test "it can update a cluster provider" do
      user = insert(:user)
      insert(:cluster, self: true)
      deployment_settings(write_bindings: [%{user_id: user.id}])

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      {:ok, %{data: %{"updateClusterProvider" => update}}} = run_query("""
        mutation create($id: ID!, $attrs: ClusterProviderUpdateAttributes!) {
          updateClusterProvider(id: $id, attributes: $attrs) { id }
        }
      """, %{"id" => provider.id, "attrs" => %{
        "cloudSettings" => %{"aws" => %{"accessKeyId" => "aid", "secretAccessKey" => "sak"}}
      }}, %{current_user: user})

      assert update["id"] == provider.id
    end
  end

  describe "createServiceDeployment" do
    test "it can create a new service" do
      cluster = insert(:cluster)
      user = admin_user()
      git = insert(:git_repository)

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

    test "it can create a new service by handle" do
      cluster = insert(:cluster, handle: "test")
      user = admin_user()
      git = insert(:git_repository)

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
            editable
          }
        }
      """, %{
        "attributes" => %{
          "git" => %{"ref" => "main", "folder" => "k8s"},
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
    end

    test "updates the service by handle" do
      cluster = insert(:cluster, handle: "test")
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
        mutation Update($components: [ServiceComponents], $id: ID!) {
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
        mutation Update($components: [ServiceComponents], $errors: [ServiceErrorAttributes], $id: ID!) {
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
  end

  describe "updateDeploymentSettings" do
    test "admins can update settings" do
      admin = admin_user()
      settings = deployment_settings()
      git = insert(:git_repository)

      {:ok, %{data: %{"updateDeploymentSettings" => updated}}} = run_query("""
        mutation Update($attrs: DeploymentSettingsAttributes!) {
          updateDeploymentSettings(attributes: $attrs) {
            id
            deployerRepository { id }
          }
        }
      """, %{"attrs" => %{"deployerRepositoryId" => git.id}}, %{current_user: admin})

      assert updated["id"] == settings.id
      assert updated["deployerRepository"]["id"] == git.id
    end
  end

  describe "createGlobalService" do
    test "it will make a service global" do
      svc = insert(:service)

      {:ok, %{data: %{"createGlobalService" => create}}} = run_query("""
        mutation Create($sid: ID!, $attrs: GlobalServiceAttributes!) {
          createGlobalService(serviceId: $sid, attributes: $attrs) {
            service { id }
            tags { name value }
          }
        }
      """, %{
        "sid" => svc.id,
        "attrs" => %{
          "name" => "test",
          "tags" => [%{"name" => "name", "value" => "value"}]
        }
      }, %{current_user: admin_user()})

      assert create["service"]["id"] == svc.id
      [tag] = create["tags"]
      assert tag["name"] == "name"
      assert tag["value"] == "value"
    end

    test "it will make a service global by handle" do
      cluster = insert(:cluster, handle: "test")
      svc = insert(:service, cluster: cluster)

      {:ok, %{data: %{"createGlobalService" => create}}} = run_query("""
        mutation Create($cluster: String!, $name: String!, $attrs: GlobalServiceAttributes!) {
          createGlobalService(cluster: $cluster, name: $name, attributes: $attrs) {
            service { id }
            tags { name value }
          }
        }
      """, %{
        "cluster" => cluster.handle,
        "name" => svc.name,
        "attrs" => %{
          "name" => "test",
          "tags" => [%{"name" => "name", "value" => "value"}]
        }
      }, %{current_user: admin_user()})

      assert create["service"]["id"] == svc.id
      [tag] = create["tags"]
      assert tag["name"] == "name"
      assert tag["value"] == "value"
    end
  end

  describe "deleteGlobalService" do
    test "it can delete a global service record" do
      global = insert(:global_service)

      {:ok, %{data: %{"deleteGlobalService" => deleted}}} = run_query("""
        mutation Delete($id: ID!) {
          deleteGlobalService(id: $id) { id }
        }
      """, %{"id" => global.id}, %{current_user: admin_user()})

      assert deleted["id"] == global.id
      refute refetch(global)
    end
  end

  describe "enableDeployments" do
    test "it will install cd" do
      user = admin_user()
      insert(:deployment_settings)
      %{deploy_token: token} = insert(:cluster, self: true)
      expect(Console.Commands.Plural, :install_cd, fn _, ^token -> {:ok, ""} end)

      {:ok, %{data: %{"enableDeployments" => settings}}} = run_query("""
        mutation {
          enableDeployments { id enabled }
        }
      """, %{}, %{current_user: user})

      assert settings["enabled"]
    end
  end
end
