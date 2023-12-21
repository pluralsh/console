defmodule Console.GraphQl.DeploymentQueriesTest do
  use Console.DataCase, async: true
  alias Kube.HelmRepository
  use Mimic

  describe "gitRepositories" do
    test "it can list git repositories" do
      repos = insert_list(3, :git_repository)

      {:ok, %{data: %{"gitRepositories" => found}}} = run_query("""
        query {
          gitRepositories(first: 5) {
            edges { node { id url } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert from_connection(found)
             |> ids_equal(repos)
      assert from_connection(found)
             |> Enum.all?(& &1["url"])
    end
  end

  describe "gitRepository" do
    test "it can fetch a git repository by id" do
      repo = insert(:git_repository)

      {:ok, %{data: %{"gitRepository" => found}}} = run_query("""
        query Git($id: ID!) {
          gitRepository(id: $id) { id }
        }
      """, %{"id" => repo.id}, %{current_user: admin_user()})

      assert found["id"] == repo.id
    end

    test "it can fetch a git repository by url" do
      repo = insert(:git_repository)

      {:ok, %{data: %{"gitRepository" => found}}} = run_query("""
        query Git($url: String!) {
          gitRepository(url: $url) { id }
        }
      """, %{"url" => repo.url}, %{current_user: admin_user()})

      assert found["id"] == repo.id
    end

    test "users without access cannot fetch" do
      repo = insert(:git_repository)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Git($url: String!) {
          gitRepository(url: $url) { id }
        }
      """, %{"url" => repo.url}, %{current_user: insert(:user)})
    end
  end

  describe "clusters" do
    test "it can list clusters in the system" do
      clusters = insert_list(3, :cluster)

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 5) {
            edges { node { id name } }
          }
        }
      """, %{}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, clusters)
      assert Enum.all?(found, & &1["name"])
    end

    test "it will respect rbac" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      clusters = insert_list(3, :cluster, read_bindings: [%{group_id: group.id}])
      other = insert(:cluster, write_bindings: [%{user_id: user.id}])
      insert_list(3, :cluster)

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([other | clusters])

      {:ok, %{data: %{"clusters" => found}}} = run_query("""
        query {
          clusters(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found) == []
    end
  end

  describe "cluster" do
    test "it can fetch a cluster by id" do
      cluster = insert(:cluster)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { id }
        }
      """, %{"id" => cluster.id}, %{current_user: admin_user()})

      assert found["id"] == cluster.id
    end

    test "writers can query deploy tokens" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { deployToken }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["deployToken"] == cluster.deploy_token
    end

    test "non writers cannot query deploy tokens" do
      cluster = insert(:cluster)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { deployToken }
        }
      """, %{"id" => cluster.id}, %{current_user: insert(:user)})
    end

    test "it can fetch by deploy token" do
      cluster = insert(:cluster)
      revision = insert(:cluster_revision, cluster: cluster)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query {
          cluster {
            id
            revisions(first: 5) { edges { node { id } } }
          }
        }
      """, %{"id" => cluster.id}, %{cluster: cluster})

      assert found["id"] == cluster.id
      assert from_connection(found["revisions"])
             |> ids_equal([revision])
    end

    test "it can fetch runtime services" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}], current_version: "1.25")
      runtime = insert(:runtime_service, cluster: cluster, name: "ingress-nginx", version: "1.5.1")

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query Cluster($id: ID!) {
          cluster(id: $id) {
            id
            runtimeServices {
              id
              name
              version
              addon { versions { version kube } }
              addonVersion {
                version
                kube
                blocking(kubeVersion: "1.26")
              }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id
      [svc] = found["runtimeServices"]
      assert svc["id"] == runtime.id
      assert svc["name"] == "ingress-nginx"
      assert svc["addonVersion"]["blocking"]
      assert svc["addonVersion"]["kube"] == ~w(1.25 1.24 1.23)

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query Cluster($id: ID!) {
          cluster(id: $id) {
            id
            runtimeServices {
              id
              name
              version
              addon { versions { version kube } }
              addonVersion {
                version
                kube
                blocking(kubeVersion: "1.25")
              }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id
      [svc] = found["runtimeServices"]
      assert svc["id"] == runtime.id
      assert svc["name"] == "ingress-nginx"
      refute svc["addonVersion"]["blocking"]
      assert svc["addonVersion"]["kube"] == ~w(1.25 1.24 1.23)
    end

    test "it can fetch runtime services on weird semver boundaries" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}], current_version: "1.25")
      runtime = insert(:runtime_service, cluster: cluster, name: "cert-manager", version: "1.13.1")

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query Cluster($id: ID!) {
          cluster(id: $id) {
            id
            runtimeServices {
              id
              name
              version
              addon { versions { version kube } }
              addonVersion {
                version
                kube
                blocking(kubeVersion: "1.26")
              }
            }
          }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id
      [svc] = found["runtimeServices"]
      assert svc["id"] == runtime.id
      assert svc["name"] == "cert-manager"
      assert svc["version"] == "1.13.1"
      refute svc["addonVersion"]["blocking"]
      assert svc["addonVersion"]["kube"] == ~w(1.28 1.27 1.26 1.25 1.24 1.23)
    end

    test "it respects rbac" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"cluster" => found}}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { id }
        }
      """, %{"id" => cluster.id}, %{current_user: user})

      assert found["id"] == cluster.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query cluster($id: ID!) {
          cluster(id: $id) { id }
        }
      """, %{"id" => cluster.id}, %{current_user: insert(:user)})
    end
  end

  describe "serviceDeployments" do
    test "it can list services in the system" do
      cluster = insert(:cluster)
      services = insert_list(3, :service, cluster: cluster)

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query Services($clusterId: ID!) {
          serviceDeployments(clusterId: $clusterId, first: 5) {
            edges { node { id name } }
          }
        }
      """, %{"clusterId" => cluster.id}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, services)
      assert Enum.all?(found, & &1["name"])
    end

    test "it can sideload helm repositories" do
      cluster = insert(:cluster)
      services = insert_list(3, :service, cluster: cluster)
      svc = insert(:service, cluster: cluster, helm: %{chart: "chart", version: "0.1.0", repository: %{namespace: "ns", name: "name"}})
      expect(Kube.Client, :list_helm_repositories, fn ->
        {:ok, %{items: [%Kube.HelmRepository{
          metadata: %{namespace: "ns", name: "name"},
          spec: %Kube.HelmRepository.Spec{url: "https://helm.sh"},
        }]}}
      end)

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query Services($clusterId: ID!) {
          serviceDeployments(clusterId: $clusterId, first: 5) {
            edges {
              node {
                id
                helmRepository { spec { url } }
              }
            }
          }
        }
      """, %{"clusterId" => cluster.id}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, [svc | services])
      assert Enum.any?(found, & &1["helmRepository"])
    end

    test "it can list services in the system by cluster handle" do
      cluster = insert(:cluster, handle: "test")
      services = insert_list(3, :service, cluster: cluster)
      insert_list(3, :service)

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query Services($cluster: String!) {
          serviceDeployments(cluster: $cluster, first: 5) {
            edges { node { id name } }
          }
        }
      """, %{"cluster" => cluster.handle}, %{current_user: admin_user()})

      found = from_connection(found)

      assert ids_equal(found, services)
      assert Enum.all?(found, & &1["name"])
    end

    test "it will respect rbac" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      cluster = insert(:cluster, write_bindings: [%{group_id: group.id}])
      svcs  = insert_list(3, :service, cluster: cluster)
      other = insert(:service, read_bindings: [%{user_id: user.id}])
      insert_list(3, :service)

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query {
          serviceDeployments(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([other | svcs])

      {:ok, %{data: %{"serviceDeployments" => found}}} = run_query("""
        query {
          serviceDeployments(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found) == []
    end
  end

  describe "clusterServices" do
    test "it can fetch the services for a cluster" do
      cluster = insert(:cluster)
      services = insert_list(3, :service, cluster: cluster)
      insert_list(3, :service)

      {:ok, %{data: %{"clusterServices" => svcs}}} = run_query("""
        query {
          clusterServices { id tarball }
        }
      """, %{}, %{cluster: cluster})

      assert ids_equal(svcs, services)
      assert Enum.all?(svcs, & &1["tarball"])
    end
  end

  describe "serviceDeployment" do
    test "it can fetch a services configuration and revisions" do
      user = admin_user()
      cluster = insert(:cluster)
      repository = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}]
      ])
      components = insert_list(3, :service_component, service: service)

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query Service($id: ID!) {
          serviceDeployment(id: $id) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
            revisions(first: 5) { edges { node { id } } }
            components { id group synced state}
          }
        }
      """, %{"id" => service.id}, %{current_user: user})

      assert found["name"] == "test"
      assert found["namespace"] == "test"
      assert found["git"]["ref"] == "master"
      assert found["git"]["folder"] == "k8s"
      [conf] = found["configuration"]
      assert conf["name"] == "name"
      assert conf["value"] == "value"

      [revision] = from_connection(found["revisions"])
      assert revision["id"] == service.revision_id

      assert ids_equal(found["components"], components)
      assert Enum.all?(found["components"], & &1["synced"])
      assert Enum.all?(found["components"], & &1["group"] == "networking.k8s.io")
      assert Enum.all?(found["components"], & &1["state"] == "RUNNING")
    end

    test "it can fetch a service by handle/name" do
      user = admin_user()
      cluster = insert(:cluster, handle: "test")
      repository = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}]
      ])

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query Service($cluster: String!, $name: String!) {
          serviceDeployment(cluster: $cluster, name: $name) {
            id
            name
            namespace
          }
        }
      """, %{"cluster" => "test", "name" => "test"}, %{current_user: user})

      assert found["id"] == service.id
      assert found["name"] == "test"
      assert found["namespace"] == "test"
    end

    test "clusters can fetch a services configuration and revisions" do
      user = admin_user()
      cluster = insert(:cluster)
      repository = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}]
      ])
      components = insert_list(3, :service_component, service: service)

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query Service($id: ID!) {
          serviceDeployment(id: $id) {
            name
            namespace
            git { ref folder }
            repository { id }
            configuration { name value }
            revisions(first: 5) { edges { node { id } } }
            components { id group synced state}
          }
        }
      """, %{"id" => service.id}, %{cluster: cluster})

      assert found["name"] == "test"
      assert found["namespace"] == "test"
      assert found["git"]["ref"] == "master"
      assert found["git"]["folder"] == "k8s"
      [conf] = found["configuration"]
      assert conf["name"] == "name"
      assert conf["value"] == "value"

      [revision] = from_connection(found["revisions"])
      assert revision["id"] == service.revision_id

      assert ids_equal(found["components"], components)
      assert Enum.all?(found["components"], & &1["synced"])
      assert Enum.all?(found["components"], & &1["group"] == "networking.k8s.io")
      assert Enum.all?(found["components"], & &1["state"] == "RUNNING")
    end

    test "it can fetch helm values with rbac protection" do
      user = admin_user()
      reader = insert(:user)
      cluster = insert(:cluster)
      repository = insert(:git_repository)
      {:ok, service} = create_service(cluster, user, [
        name: "test",
        namespace: "test",
        git: %{ref: "master", folder: "k8s"},
        helm: %{values: "secret: value"},
        repository_id: repository.id,
        configuration: [%{name: "name", value: "value"}],
        read_bindings: [%{user_id: reader.id}]
      ])

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query Service($id: ID!) {
          serviceDeployment(id: $id) {
            name
            namespace
            git { ref folder }
            helm { values }
            repository { id }
          }
        }
      """, %{"id" => service.id}, %{current_user: user})

      assert found["helm"]["values"] == "secret: value"

      {:ok, %{data: %{"serviceDeployment" => found}, errors: [_ | _]}} = run_query("""
        query Service($id: ID!) {
          serviceDeployment(id: $id) {
            name
            namespace
            git { ref folder }
            helm { values }
            repository { id }
          }
        }
      """, %{"id" => service.id}, %{current_user: reader})

      refute found["helm"]["values"]
    end

    test "it respects rbac" do
      user = insert(:user)
      service = insert(:service, read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"serviceDeployment" => found}}} = run_query("""
        query serviceDeployment($id: ID!) {
          serviceDeployment(id: $id) {
            id
            editable
          }
        }
      """, %{"id" => service.id}, %{current_user: user})

      assert found["id"] == service.id
      refute found["editable"]

      {:ok, %{errors: [_ | _]}} = run_query("""
        query serviceDeployment($id: ID!) {
          serviceDeployment(id: $id) { id }
        }
      """, %{"id" => service.id}, %{current_user: insert(:user)})
    end
  end

  describe "deploymentSettings" do
    test "users can fetch settings" do
      admin = insert(:user)
      settings = deployment_settings()

      {:ok, %{data: %{"deploymentSettings" => updated}}} = run_query("""
        query {
          deploymentSettings {
            id
            deployerRepository { id }
          }
        }
      """, %{}, %{current_user: admin})

      assert updated["id"] == settings.id
      assert updated["deployerRepository"]["id"] == settings.deployer_repository_id
    end
  end

  describe "clusterProviders" do
    test "it will list cluster providers" do
      user = admin_user()
      providers = for cloud <- ~w(aws gcp azure),
        do: insert(:cluster_provider, cloud: cloud)

      {:ok, %{data: %{"clusterProviders" => found}}} = run_query("""
        query {
          clusterProviders(first: 5) { edges { node { id supportedVersions } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal(providers)
      refute from_connection(found)
             |> Enum.any?(&Enum.empty?(&1["supportedVersions"]))
    end

    test "it will respect rbac" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      providers = insert_list(3, :cluster_provider, write_bindings: [%{group_id: group.id}])
      other = insert(:cluster_provider, read_bindings: [%{user_id: user.id}])
      insert_list(3, :cluster_provider)

      {:ok, %{data: %{"clusterProviders" => found}}} = run_query("""
        query {
          clusterProviders(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([other | providers])

      {:ok, %{data: %{"clusterProviders" => found}}} = run_query("""
        query {
          clusterProviders(first: 10) { edges { node { id } } }
        }
      """, %{}, %{current_user: insert(:user)})

      assert from_connection(found) == []
    end
  end

  describe "clusterProvider" do
    test "it can fetch a cluster provider by id" do
      admin = admin_user()
      provider = insert(:cluster_provider)

      {:ok, %{data: %{"clusterProvider" => updated}}} = run_query("""
        query provider($id: ID!) {
          clusterProvider(id: $id) { id }
        }
      """, %{"id" => provider.id}, %{current_user: admin})

      assert updated["id"] == provider.id
    end

    test "it respects rbac" do
      admin = insert(:user)
      provider = insert(:cluster_provider)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query provider($id: ID!) {
          clusterProvider(id: $id) { id }
        }
      """, %{"id" => provider.id}, %{current_user: admin})
    end
  end

  describe "myCluster" do
    test "it can fetch a cluster back by deploy token" do
      cluster = insert(:cluster)

      {:ok, %{data: %{"myCluster" => found}}} = run_query("""
        query {
          myCluster { id }
        }
      """, %{}, %{cluster: cluster})

      assert found["id"] == cluster.id
    end
  end

  describe "tokenExchange" do
    test "it can exchange a kubeconfig token for a user if they have access to the given cluster" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])
      token = insert(:access_token, user: user)

      {:ok, %{data: %{"tokenExchange" => found}}} = run_query("""
        query Exchange($token: String!) {
          tokenExchange(token: $token) { id }
        }
      """, %{"token" => "plrl:#{cluster.id}:#{token.token}"})

      assert found["id"] == user.id
    end

    test "if the user doesn't have access it will error" do
      user = insert(:user)
      cluster = insert(:cluster)
      token = insert(:access_token, user: user)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Exchange($token: String!) {
          tokenExchange(token: $token) { id }
        }
      """, %{"token" => "plrl:#{cluster.id}:#{token.token}"})
    end

    test "if the token is invalid it will error" do
      user = insert(:user)
      cluster = insert(:cluster, read_bindings: [%{user_id: user.id}])

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Exchange($token: String!) {
          tokenExchange(token: $token) { id }
        }
      """, %{"token" => "plrl:#{cluster.id}:console-bogus"})
    end

    test "if the cluster doesn't exist it will error" do
      user = insert(:user)
      token = insert(:access_token, user: user)

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Exchange($token: String!) {
          tokenExchange(token: $token) { id }
        }
      """, %{"token" => "plrl:#{Ecto.UUID.generate()}:#{token.token}"})
    end
  end

  describe "serviceStatuses" do
    test "it can list the statuses counts for a service query" do
      cluster = insert(:cluster)
      insert_list(3, :service, cluster: cluster, status: :stale)
      insert_list(2, :service, cluster: cluster, status: :healthy)

      {:ok, %{data: %{"serviceStatuses" => statuses}}} = run_query("""
        query statuses($cluster: ID!) {
          serviceStatuses(clusterId: $cluster) { status count }
        }
      """, %{"cluster" => cluster.id}, %{current_user: admin_user()})

      statuses = Map.new(statuses, & {&1["status"], &1["count"]})
      assert statuses["STALE"] == 3
      assert statuses["HEALTHY"] == 2
    end
  end

  describe "pipelines" do
    test "it will list pipelines w/ rbac in mind" do
      user = insert(:user)
      %{group: group} = insert(:group_member, user: user)
      pipes = insert_list(3, :pipeline, read_bindings: [%{group_id: group.id}])
      other = insert(:pipeline, write_bindings: [%{user_id: user.id}])
      insert_list(3, :pipeline)

      {:ok, %{data: %{"pipelines" => found}}} = run_query("""
        query {
          pipelines(first: 5) {
            edges {
              node { id }
            }
          }
        }
      """, %{}, %{current_user: user})

      assert from_connection(found)
             |> ids_equal([other | pipes])
    end
  end

  describe "pipeline" do
    test "it can fetch a pipeline by id" do
      user = insert(:user)
      pipe = insert(:pipeline, read_bindings: [%{user_id: user.id}])

      {:ok, %{data: %{"pipeline" => found}}} = run_query("""
        query Pipe($id: ID!) {
          pipeline(id: $id) { id }
        }
      """, %{"id" => pipe.id}, %{current_user: user})

      assert found["id"] == pipe.id

      {:ok, %{errors: [_ | _]}} = run_query("""
        query Pipe($id: ID!) {
          pipeline(id: $id) { id }
        }
      """, %{"id" => pipe.id}, %{current_user: insert(:user)})
    end
  end

  describe "clusterGates" do
    test "it will fetch the gates configured for a cluster" do
      cluster = insert(:cluster)
      other   = insert(:cluster)
      job = insert(:pipeline_gate, type: :job, state: :pending, cluster: cluster)
      insert(:pipeline_gate, type: :job, state: :pending, cluster: other)
      insert(:pipeline_gate, type: :job, state: :open, cluster: cluster)
      insert(:pipeline_gate, type: :job, state: :closed, cluster: cluster)
      insert(:pipeline_gate, type: :approval)

      {:ok, %{data: %{"clusterGates" => [found]}}} = run_query("""
        query {
          clusterGates { id }
        }
      """, %{}, %{cluster: cluster})

      assert found["id"] == job.id
    end
  end

  describe "helmRepository" do
    test "it can fetch the charts from a helm repository" do
      expect(Kube.Client, :get_helm_repository, fn "helm-charts", "console" ->
        {:ok, %HelmRepository{
          status: %HelmRepository.Status{
            artifact: %HelmRepository.Status.Artifact{url: "https://pluralsh.github.io/console/index.yaml"}
          }
        }}
      end)

      {:ok, %{data: %{"helmRepository" => repo}}} = run_query("""
        query {
          helmRepository(namespace: "helm-charts", name: "console") {
            charts {
              name
              versions { name version appVersion }
            }
          }
        }
      """, %{}, %{current_user: admin_user()})

      [%{"name" => "console", "versions" => [chart | _]} | _] = repo["charts"]
      assert chart["name"] == "console"
      assert chart["version"]
      assert chart["appVersion"]
    end
  end

  describe "clusterStatuses" do
    test "it can aggregate statuses for all visible clusters" do
      admin = admin_user()
      insert_list(2, :cluster, pinged_at: Timex.now())
      insert_list(3, :cluster, pinged_at: Timex.now() |> Timex.shift(days: -1))
      insert(:cluster)

      {:ok, %{data: %{"clusterStatuses" => res}}} = run_query("""
        query {
          clusterStatuses {
            healthy
            count
          }
        }
      """, %{}, %{current_user: admin})

      assert length(res) == 3
      as_map = Map.new(res, & {&1["healthy"], &1})
      assert as_map[true]["count"] == 2
      assert as_map[false]["count"] == 3
      assert as_map[nil]["count"] == 1
    end
  end

  describe "tags" do
    test "it can list cluster tag names and values" do
      user = insert(:user)
      cluster = insert(:cluster)
      insert(:tag, cluster: cluster, name: "first", value: "value")
      insert(:tag, cluster: cluster, name: "second", value: "value")
      insert(:tag, cluster: build(:cluster), name: "first", value: "value2")

      {:ok, %{data: %{"tags" => ["first", "second"]}}} = run_query("""
        query {
          tags
        }
      """, %{}, %{current_user: user})

      {:ok, %{data: %{"tags" => ["value", "value2"]}}} = run_query("""
        query {
          tags(tag: "first")
        }
      """, %{}, %{current_user: user})
    end
  end
end

defmodule Console.GraphQl.Mutations.SyncDeploymentQueriesTest do
  use Console.DataCase, async: false
  use Mimic

  describe "gitRepository" do
    test "it can fetch the refs from a git repository" do
      admin = admin_user()
      git = insert(:git_repository, url: "https://github.com/pluralsh/console.git")

      {:ok, %{data: %{"gitRepository" => %{"refs" => refs}}}} = run_query("""
        query Git($id: ID!) {
          gitRepository(id: $id) {
            refs
          }
        }
      """, %{"id" => git.id}, %{current_user: admin})

      assert Enum.member?(refs, "refs/heads/master")
    end
  end
end
