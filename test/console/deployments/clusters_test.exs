defmodule Console.Deployments.ClustersTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.{Clusters, Services, Settings}
  alias Kazan.Apis.Core.V1, as: CoreV1
  import KubernetesScaffolds

  describe "#create_cluster/2" do
    test "it can create a new cluster record" do
      user = admin_user()
      provider = insert(:cluster_provider)
      self = insert(:cluster, self: true)
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [%{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}]
      }, user)

      assert cluster.name == "test"
      assert cluster.version == "1.25"
      assert cluster.provider_id == provider.id
      assert cluster.deploy_token
      assert cluster.token_readable
      assert cluster.project_id == Settings.default_project!().id

      assert_receive {:event, %PubSub.ClusterCreated{item: ^cluster}}

      [pool] = cluster.node_pools
      assert pool.name == "pool"
      assert pool.min_size == 1
      assert pool.max_size == 5
      assert pool.instance_type == "t5.large"

      %{service: svc} = Console.Repo.preload(cluster, [:service])
      assert svc.repository_id == provider.repository_id
      assert svc.name == "cluster-#{provider.name}-#{cluster.name}"
      assert svc.namespace == provider.namespace
      assert svc.cluster_id == self.id
      assert svc.protect

      {:ok, secrets} = Services.configuration(svc)
      assert secrets["clusterName"] == cluster.name
      assert secrets["version"] == cluster.version
      assert secrets["operatorNamespace"] == "plrl-deploy-operator"
      assert secrets["consoleUrl"] == Path.join(Console.conf(:ext_url), "ext/gql")
      assert secrets["deployToken"] == cluster.deploy_token
      assert secrets["clusterId"] == cluster.id
      [node_pool] = Jason.decode!(secrets["nodePools"])
      assert node_pool["name"] == pool.name
      assert node_pool["min_size"] == pool.min_size
      assert node_pool["max_size"] == pool.max_size
      assert node_pool["instance_type"] == "t5.large"

      [svc] = Clusters.services(cluster)

      assert svc.repository_id == git.id
      assert svc.git.ref == Console.Deployments.Settings.agent_ref()
      assert svc.git.folder == "charts/deployment-operator"
      assert svc.templated

      {:ok, %{"deployToken" => token, "url" => url} = secrets} = Services.configuration(svc)
      assert token == cluster.deploy_token
      assert url == Path.join(Console.conf(:ext_url), "ext/gql")
      assert secrets["clusterId"] == cluster.id
      assert secrets["kasAddress"] == "wss://kas.example.com"

      [revision] = Clusters.revisions(cluster)
      assert revision.version == cluster.version
      assert length(revision.node_pools) == length(cluster.node_pools)
    end

    test "creating a new management cluster when cloud is enabled installs a controller service" do
      user = admin_user()
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      expect(Console, :cloud?, fn -> true end)

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "mgmt",
        self: true
      }, user)

      assert cluster.name == "mgmt"
      assert cluster.deploy_token

      assert_receive {:event, %PubSub.ClusterCreated{item: ^cluster}}

      %{"console-controller" => svc} = Clusters.services(cluster) |> Map.new(& {&1.name, &1})

      assert svc.helm.url == "https://pluralsh.github.io/console"
      assert svc.helm.chart == "controller"
      assert svc.helm.version == "x.x.x"

      vals = Jason.decode!(svc.helm.values)
      assert vals["consoleUrl"]
      assert vals["tokenSecretRef"]["create"]
      assert vals["tokenSecretRef"]["token"]
    end

    test "it can create a new byok cluster record" do
      user = admin_user()
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        write_bindings: [%{group_id: insert(:group).id}]
      }, user)

      assert cluster.name == "test"
      assert cluster.deploy_token
      assert cluster.token_readable

      assert_receive {:event, %PubSub.ClusterCreated{item: ^cluster}}

      %{write_bindings: [userb, group]} = Console.Repo.preload(cluster, [:write_bindings])

      assert group.group_id
      assert userb.user_id == user.id

      [svc] = Clusters.services(cluster)

      assert svc.repository_id == git.id
      assert svc.git.ref == Console.Deployments.Settings.agent_ref()
      assert svc.git.folder == "charts/deployment-operator"
      assert svc.templated

      {:ok, %{"deployToken" => token, "url" => url} = secrets} = Services.configuration(svc)
      assert token == cluster.deploy_token
      assert url == Path.join(Console.conf(:ext_url), "ext/gql")
      assert secrets["clusterId"] == cluster.id
      assert secrets["kasAddress"] == "wss://kas.example.com"
    end

    test "it can create a gcp cluster with cloud specific configs" do
      user = admin_user()
      provider = insert(:cluster_provider, cloud: "gcp")
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.31.4",
        provider_id: provider.id,
        cloud_settings: %{gcp: %{project: "test-project", network: "test", region: "us-east1"}},
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      assert cluster.name == "test"
      assert cluster.version == "1.31.4"

      %{service: svc} = Console.Repo.preload(cluster, [:service])
      {:ok, secrets} = Services.configuration(svc)
      assert secrets["project"] == "test-project"
      assert secrets["network"] == "test"
      assert secrets["region"] == "us-east1"
    end

    test "it can create a azure cluster with cloud specific configs" do
      user = admin_user()
      provider = insert(:cluster_provider, cloud: "azure")
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.30.0",
        provider_id: provider.id,
        cloud_settings: %{azure: %{location: "test", network: "test", resource_group: "test group", subscription_id: "test-subscription"}},
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      assert cluster.name == "test"
      assert cluster.version == "1.30.0"

      %{service: svc} = Console.Repo.preload(cluster, [:service])
      {:ok, secrets} = Services.configuration(svc)
      assert secrets["location"] == "test"
      assert secrets["network"] == "test"
      assert secrets["resourceGroup"] == "test group"
      assert secrets["subscriptionId"] == "test-subscription"
    end

    test "it can create an aws cluster with cloud specific configs" do
      user = admin_user()
      provider = insert(:cluster_provider, cloud: "aws")
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25",
        provider_id: provider.id,
        cloud_settings: %{aws: %{region: "us-east-1"}},
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      assert cluster.name == "test"
      assert cluster.version == "1.25"

      %{service: svc} = Console.Repo.preload(cluster, [:service])
      {:ok, secrets} = Services.configuration(svc)
      assert secrets["region"] == "us-east-1"
    end

    test "it will correctly validate provider-specific k8s versions" do
      user = admin_user()
      provider = insert(:cluster_provider, cloud: "gcp")
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:error, _} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25.2",
        provider_id: provider.id,
        cloud_settings: %{gcp: %{project: "test-project", network: "test", region: "us-east1"}},
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)
    end

    test "it can create a new cluster record with a provider credential" do
      user = admin_user()
      provider = insert(:cluster_provider)
      cred = insert(:provider_credential, provider: provider)
      self = insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25",
        provider_id: provider.id,
        credential_id: cred.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      assert cluster.name == "test"
      assert cluster.version == "1.25"
      assert cluster.provider_id == provider.id
      assert cluster.deploy_token
      assert cluster.token_readable

      assert_receive {:event, %PubSub.ClusterCreated{item: ^cluster}}

      [pool] = cluster.node_pools
      assert pool.name == "pool"
      assert pool.min_size == 1
      assert pool.max_size == 5
      assert pool.instance_type == "t5.large"

      %{service: svc} = Console.Repo.preload(cluster, [:service])
      assert svc.repository_id == provider.repository_id
      assert svc.name == "cluster-#{provider.name}-#{cred.name}-#{cluster.name}"
      assert svc.namespace == cred.namespace
      assert svc.cluster_id == self.id

      {:ok, secrets} = Services.configuration(svc)
      assert secrets["clusterName"] == cluster.name
      assert secrets["version"] == cluster.version
      assert secrets["operatorNamespace"] == "plrl-deploy-operator"
      assert secrets["consoleUrl"] == Path.join(Console.conf(:ext_url), "ext/gql")
      assert secrets["deployToken"] == cluster.deploy_token
      assert secrets["clusterId"] == cluster.id
      assert Jason.decode!(secrets["credential"])["name"] == cred.name
      [node_pool] = Jason.decode!(secrets["nodePools"])
      assert node_pool["name"] == pool.name
      assert node_pool["min_size"] == pool.min_size
      assert node_pool["max_size"] == pool.max_size
      assert node_pool["instance_type"] == "t5.large"
    end

    test "it can overwrite agent helm values if specified" do
      user = admin_user()
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      insert(:deployment_settings, agent_helm_values: "bogus: values", deployer_repository: git)

      {:ok, cluster} = Clusters.create_cluster(%{name: "test"}, user)

      [svc] = Clusters.services(cluster)

      assert svc.repository_id == git.id
      assert svc.git.ref == Console.Deployments.Settings.agent_ref()
      assert svc.git.folder == "charts/deployment-operator"
      assert svc.helm.values == "bogus: values"
    end

    test "it will respect project rbac" do
      user = insert(:user)
      proj = insert(:project, write_bindings: [%{user_id: user.id}])
      deployment_settings(read_bindings: [%{user_id: user.id}])

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        project_id: proj.id
      }, user)

      assert cluster.name == "test"
      assert cluster.project_id == proj.id
    end

    test "it will respect rbac" do
      user = insert(:user)
      deployment_settings(create_bindings: [%{user_id: user.id}])
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)

      {:ok, _} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      {:error, _} = Clusters.create_cluster(%{
        name: "another-test",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, insert(:user))
    end
  end

  describe "#update_cluster/2" do
    test "it can create a new cluster record" do
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

      {:ok, cluster} = Clusters.update_cluster(%{
        version: "1.25",
        node_pools: [
          %{name: "pool", min_size: 2, max_size: 5, instance_type: "t5.large"}
        ]
      }, cluster.id, user)

      assert_receive {:event, %PubSub.ClusterUpdated{item: ^cluster}}

      [pool] = cluster.node_pools
      assert pool.min_size == 2
      %{service: svc} = Console.Repo.preload(cluster, [:service])

      {:ok, %{"version" => vsn, "nodePools" => pools, "clusterName" => name}} = Services.configuration(svc)
      assert name == cluster.name
      assert vsn == cluster.version
      [node_pool] = Jason.decode!(pools)
      assert node_pool["name"] == pool.name
      assert node_pool["min_size"] == pool.min_size
      assert node_pool["max_size"] == pool.max_size
      assert node_pool["instance_type"] == "t5.large"

      [revision, _] = Clusters.revisions(cluster)

      assert revision.version == cluster.version
      [np] = revision.node_pools
      assert np.name == pool.name
      assert np.min_size == pool.min_size
      assert np.max_size == pool.max_size
      assert np.instance_type == pool.instance_type

      {:error, _} = Clusters.update_cluster(%{
        version: "1.25",
        node_pools: [
          %{name: "pool", min_size: 2, max_size: 5, instance_type: "t5.large"}
        ]
      }, cluster.id, insert(:user))
    end

    test "it will validate that version changes don't exceed 1 minor version" do
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

      {:ok, cluster} = Clusters.update_cluster(%{
        version: "1.26",
        node_pools: [
          %{name: "pool", min_size: 2, max_size: 5, instance_type: "t5.large"}
        ]
      }, cluster.id, user)

      {:error, _} = Clusters.update_cluster(%{
        version: "1.28",
        node_pools: [
          %{name: "pool", min_size: 2, max_size: 5, instance_type: "t5.large"}
        ]
      }, cluster.id, user)
    end

    test "it will validate that version changes don't happen when others are pending" do
      user = admin_user()
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.25.0",
        current_version: "1.25.0",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      assert cluster.current_version == "1.25.0"

      {:ok, cluster} = Clusters.update_cluster(%{
        version: "1.26.0",
        node_pools: [
          %{name: "pool", min_size: 2, max_size: 5, instance_type: "t5.large"}
        ]
      }, cluster.id, user)

      assert cluster.version == "1.26.0"

      {:error, _} = Clusters.update_cluster(%{
        version: "1.26.5",
        node_pools: [
          %{name: "pool", min_size: 2, max_size: 5, instance_type: "t5.large"}
        ]
      }, cluster.id, user)
    end

    test "it will validate that version changes don't exceed 1 minor version against current_version if present" do
      user = admin_user()
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.26",
        current_version: "1.26",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      {:ok, cluster} = Clusters.update_cluster(%{
        version: "1.27",
        node_pools: [
          %{name: "pool", min_size: 2, max_size: 5, instance_type: "t5.large"}
        ]
      }, cluster.id, user)

      {:error, _} = Clusters.update_cluster(%{
        version: "1.28",
        node_pools: [
          %{name: "pool", min_size: 2, max_size: 5, instance_type: "t5.large"}
        ]
      }, cluster.id, user)
    end

    test "it can update the underlying cluster service" do
      user = admin_user()
      provider = insert(:cluster_provider)
      insert(:cluster, self: true)
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, cluster} = Clusters.create_cluster(%{
        name: "test",
        version: "1.26",
        current_version: "1.26",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)

      new_git = insert(:git_repository, url: "https://github.com/pluralsh/custom-providers.git")

      {:ok, cluster} = Clusters.update_cluster(%{
        service: %{repository_id: new_git.id},
      }, cluster.id, user)

      %{service: svc} = Console.Repo.preload(cluster, [:service], force: true)

      assert svc.repository_id == new_git.id
    end

    test "nonwriters cannot update" do
      cluster = insert(:cluster)
      user = insert(:user)

      {:error, _} = Clusters.update_cluster(%{
        write_bindings: [%{user_id: user.id}]
      }, cluster.id, user)

      admin = admin_user()

      {:ok, cluster} = Clusters.update_cluster(%{
        write_bindings: [%{user_id: admin.id}]
      }, cluster.id, admin)

      assert Enum.find(cluster.write_bindings, & &1.user_id == admin.id)
    end
  end

  describe "#upsert_virtual_cluster/3" do
    test "it can create a new virtual cluster under a parent" do
      cluster = insert(:cluster, write_bindings: [%{user_id: insert(:user).id}])
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, virt} = Clusters.upsert_virtual_cluster(%{
        name: "new-cluster",
        write_bindings: [%{user_id: insert(:user).id}]
      }, cluster.id, admin_user())

      assert virt.parent_cluster_id == cluster.id
      assert virt.virtual
      assert virt.name == "new-cluster"
      assert virt.handle == "new-cluster"

      [svc] = Clusters.services(virt)

      assert svc.repository_id == git.id
      assert svc.git.ref == Console.Deployments.Settings.agent_ref()
      assert svc.git.folder == "charts/deployment-operator"
      assert svc.templated

      assert_receive {:event, %PubSub.ClusterCreated{item: ^virt}}
    end

    test "it can update a virtual cluster" do
      cluster = insert(:cluster)
      virt = insert(:cluster, virtual: true, parent_cluster: cluster, handle: "new-cluster")

      {:ok, updated} = Clusters.upsert_virtual_cluster(%{
        name: "new-cluster",
      }, cluster.id, admin_user())

      assert updated.id == virt.id
      assert updated.parent_cluster_id == cluster.id

      assert_receive {:event, %PubSub.ClusterUpdated{item: ^updated}}
    end

    test "it will error if no permissions" do
      cluster = insert(:cluster)

      {:error, _} = Clusters.upsert_virtual_cluster(%{
        name: "new-cluster",
      }, cluster.id, insert(:user))
    end

    test "it will not upsert existing non-virtual clusters" do
      cluster = insert(:cluster)
      insert(:cluster, handle: "new-cluster")

      {:error, _} = Clusters.upsert_virtual_cluster(%{
        name: "new-cluster",
      }, cluster.id, admin_user())
    end
  end

  describe "#rotate_deploy_token/1" do
    test "it will add a new deploy token for the cluster" do
      user = admin_user()
      bot("console")
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

      {:ok, updated} = Clusters.rotate_deploy_token(cluster)

      refute updated.deploy_token == cluster.deploy_token
      assert Clusters.get_by_deploy_token(cluster.deploy_token).id == cluster.id

      [svc] = Clusters.services(updated)
      {:ok, secrets} = Services.configuration(svc)
      assert secrets["deployToken"] == updated.deploy_token

      assert_receive {:event, %PubSub.ServiceUpdated{}}
    end
  end

  describe "#delete_cluster/2" do
    test "users can delete clusters if they have write permissions" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      svc = insert(:service, cluster: cluster)

      {:ok, deleted} = Clusters.delete_cluster(cluster.id, user)

      assert deleted.id == cluster.id
      assert deleted.deleted_at

      assert refetch(svc).deleted_at

      assert_receive {:event, %PubSub.ClusterDeleted{item: ^deleted}}
    end

    test "it will prevent management cluster deletion" do
      user = insert(:user)
      cluster = insert(:cluster, self: true, write_bindings: [%{user_id: user.id}])

      {:error, _} = Clusters.delete_cluster(cluster.id, user)
    end

    test "it will prevent cluster deletion if protect is enabled" do
      user = insert(:user)
      cluster = insert(:cluster, protect: true, write_bindings: [%{user_id: user.id}])

      {:error, _} = Clusters.delete_cluster(cluster.id, user)
    end
  end

  describe "#detach_cluster/2" do
    test "users can detach clusters if they have write permissions" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      svc = insert(:service, cluster: cluster)

      {:ok, deleted} = Clusters.detach_cluster(cluster.id, user)

      assert deleted.id == cluster.id
      refute refetch(deleted)
      refute refetch(svc)

      assert_receive {:event, %PubSub.ClusterDeleted{item: ^deleted}}
    end

    test "it cannot detach with a global service within the cluster" do
      user = admin_user()
      cluster = insert(:cluster)
      service = insert(:service, cluster: cluster)
      global = insert(:global_service, service: service)
      insert(:service, owner: global)

      {:ok, deleted} = Clusters.detach_cluster(cluster.id, user)

      assert deleted.id == cluster.id
    end

    test "non-writers cannot detach" do
      user = insert(:user)
      cluster = insert(:cluster)

      {:error, _} = Clusters.detach_cluster(cluster.id, user)
    end
  end

  describe "#create_provider/2" do
    test "it will create a new capi provider deployment" do
      user = insert(:user)
      settings = deployment_settings(write_bindings: [%{user_id: user.id}])
      self = insert(:cluster, self: true)

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      assert provider.name == "aws-sandbox"
      assert provider.namespace == "plrl-capi-aws-sandbox"
      refute provider.repository_id
      assert provider.git.folder == "capi/clusters/aws"
      assert provider.git.ref == "main"

      %{service: svc} = Console.Repo.preload(provider, [:service])
      assert svc.repository_id == settings.artifact_repository_id
      assert svc.name == "capi-#{provider.name}"
      assert svc.git.folder == "capi/providers/aws"
      assert svc.git.ref == "main"
      assert svc.namespace == provider.namespace
      assert svc.cluster_id == self.id
      assert svc.protect

      {:ok, secrets} = Services.configuration(svc)
      assert secrets["accessKeyId"] == "aid"
      assert secrets["secretAccessKey"] == "sak"

      assert_receive {:event, %PubSub.ProviderCreated{item: ^provider}}

      {:error, _} = Clusters.create_provider(%{
        name: "aws-sandbox-two",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, insert(:user))
    end

    test "it will properly create a gcp provider" do
      user = insert(:user)
      settings = deployment_settings(write_bindings: [%{user_id: user.id}])
      self = insert(:cluster, self: true)

      {:ok, provider} = Clusters.create_provider(%{
        name: "gcp",
        cloud_settings: %{gcp: %{application_credentials: "application-credentials"}}
      }, user)

      assert provider.name == "gcp"
      assert provider.namespace == "plrl-capi-gcp"
      refute provider.repository_id
      assert provider.git.folder == "capi/clusters/gcp"
      assert provider.git.ref == "main"

      %{service: svc} = Console.Repo.preload(provider, [:service])
      assert svc.repository_id == settings.artifact_repository_id
      assert svc.name == "capi-#{provider.name}"
      assert svc.git.folder == "capi/providers/gcp"
      assert svc.git.ref == "main"
      assert svc.namespace == provider.namespace
      assert svc.cluster_id == self.id

      {:ok, secrets} = Services.configuration(svc)
      assert secrets["applicationCredentials"] == "application-credentials"
      assert Base.decode64!(secrets["applicationCredentialsBase64"]) == "application-credentials"
    end

    test "it will properly create an azure provider" do
      user = insert(:user)
      settings = deployment_settings(write_bindings: [%{user_id: user.id}])
      self = insert(:cluster, self: true)

      {:ok, provider} = Clusters.create_provider(%{
        name: "azure",
        cloud_settings: %{azure: %{tenant_id: "tenant", subscription_id: "sub", client_id: "client", client_secret: "secret"}}
      }, user)

      assert provider.name == "azure"
      assert provider.namespace == "plrl-capi-azure"
      refute provider.repository_id
      assert provider.git.folder == "capi/clusters/azure"
      assert provider.git.ref == "main"

      %{service: svc} = Console.Repo.preload(provider, [:service])
      assert svc.repository_id == settings.artifact_repository_id
      assert svc.name == "capi-#{provider.name}"
      assert svc.git.folder == "capi/providers/azure"
      assert svc.git.ref == "main"
      assert svc.namespace == provider.namespace
      assert svc.cluster_id == self.id

      {:ok, secrets} = Services.configuration(svc)
      assert secrets["subscriptionId"] == "sub"
      assert secrets["tenantId"] == "tenant"
      assert secrets["clientId"] == "client"
      assert secrets["clientSecret"] == "secret"
    end

    test "it will not create an azure provider on gcp management clusters" do
      user = insert(:user)
      deployment_settings(write_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true, provider: build(:cluster_provider, cloud: "gcp"))

      {:error, _} = Clusters.create_provider(%{
        name: "azure",
        cloud_settings: %{azure: %{tenant_id: "tenant", subscription_id: "sub", client_id: "client", client_secret: "secret"}}
      }, user)
    end
  end

  describe "#control_plane/1" do
    test "it will use in-cluster config for self clusters" do
      cluster = insert(:cluster, self: true)
      expect(Kazan.Server, :in_cluster, fn -> %Kazan.Server{} end)

      assert Clusters.control_plane(cluster) == %Kazan.Server{}
    end

    test "it can use an uploaded kubeconfig" do
      cluster = insert(:cluster, kubeconfig: %{raw: Console.conf(:test_kubeconfig)})

      assert Clusters.control_plane(cluster) == Kazan.Server.from_kubeconfig_raw(Console.conf(:test_kubeconfig))
    end

    test "it can generate an agent kubeconfig" do
      console = insert(:user, email: "console@plural.sh")
      cluster = insert(:cluster, name: "cluster", provider: build(:cluster_provider, namespace: "test-provider"))

      server = Clusters.control_plane(cluster)
      assert server.url == "#{Console.conf(:kas_dns)}/k8s-proxy"
      ["plrl", id, token] = String.split(server.auth.token, ":")
      assert id == cluster.id
      {:ok, _} = Console.Guardian.decode_and_verify(token)

      assert Console.authed_user(token).id == console.id
    end
  end

  describe "#update_provider/3" do
    test "it can update a cluster provider" do
      user = insert(:user)
      deployment_settings(write_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true)

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      {:ok, updated} = Clusters.update_provider(%{
        cloud_settings: %{aws: %{access_key_id: "aid2", secret_access_key: "sak2"}}
      }, provider.id, user)

      %{service: svc} = Console.Repo.preload(updated, [:service])
      {:ok, secrets} = Services.configuration(svc)
      assert secrets["accessKeyId"] == "aid2"
      assert secrets["secretAccessKey"] == "sak2"

      assert_receive {:event, %PubSub.ProviderUpdated{item: ^updated}}

      {:error, _} = Clusters.update_provider(%{
        cloud_settings: %{aws: %{access_key_id: "aid2", secret_access_key: "sak2"}}
      }, provider.id, insert(:user))
    end

    test "it can update the underlying provider service if desired" do
      user = insert(:user)
      deployment_settings(write_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true)

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      git = insert(:git_repository)

      {:ok, updated} = Clusters.update_provider(%{
        service: %{repository_id: git.id}
      }, provider.id, user)

      %{service: svc} = Console.Repo.preload(updated, [:service], force: true)

      assert svc.repository_id == git.id
    end
  end

  describe "#delete_provider/2" do
    test "it can delete a given cluster provider" do
      user = insert(:user)
      deployment_settings(write_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true)

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      {:ok, deleted} = Clusters.delete_provider(provider.id, user)

      assert deleted.id == provider.id
      assert deleted.deleted_at

      %{service: svc} = Console.Repo.preload(deleted, [:service])
      assert svc.deleted_at

      assert_receive {:event, %PubSub.ProviderDeleted{item: ^deleted}}
    end

    test "users w/o write permissions cannot delete" do
      user = insert(:user)
      deployment_settings(write_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true)

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      {:error, _} = Clusters.delete_provider(provider.id, insert(:user))
    end

    test "it cannot delete if there are any attached clusters" do
      user = insert(:user)
      deployment_settings(write_bindings: [%{user_id: user.id}])
      insert(:cluster, self: true)

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      insert(:cluster, provider: provider)

      {:error, _} = Clusters.delete_provider(provider.id, user)
    end
  end

  describe "#create_provider_credential/3" do
    test "you can create credentials for a cluster provider if you have write access" do
      user = insert(:user)
      insert(:cluster, self: true)
      deployment_settings(write_bindings: [%{user_id: user.id}])

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, user)

      {:ok, cred} = Clusters.create_provider_credential(%{name: "cred", kind: "AwsStaticIdentity"}, provider.name, user)

      assert cred.provider_id == provider.id
      assert cred.namespace == "plrl-capi-#{provider.name}-#{cred.name}"

      assert_receive {:event, %PubSub.ProviderCredentialCreated{item: ^cred}}
    end

    test "you cannot create credentials for a cluster provider if you do not have write access" do
      user = insert(:user)
      deployment_settings()
      insert(:cluster, self: true)

      {:ok, provider} = Clusters.create_provider(%{
        name: "aws-sandbox",
        cloud_settings: %{aws: %{access_key_id: "aid", secret_access_key: "sak"}}
      }, admin_user())

      {:error, _} = Clusters.create_provider_credential(%{name: "cred", kind: "AwsStaticIdentity"}, provider.name, user)
    end
  end

  describe "#delete_provider_credential/2" do
    test "you can create credentials for a cluster provider if you have write access" do
      user = insert(:user)
      deployment_settings(write_bindings: [%{user_id: user.id}])
      cred = insert(:provider_credential)
      insert(:cluster, self: true)

      {:ok, deleted} = Clusters.delete_provider_credential(cred.id, user)

      assert deleted.id == cred.id
      refute refetch(deleted)

      assert_receive {:event, %PubSub.ProviderCredentialDeleted{item: ^deleted}}
    end

    test "you cannot create credentials for a cluster provider if you do not have write access" do
      user = insert(:user)
      cred = insert(:provider_credential)
      insert(:cluster, self: true)

      {:error, _} = Clusters.delete_provider_credential(cred.id, user)
    end
  end

  describe "#create_runtime_services/3" do
    test "it can create runtime services at cluster scope and overwrite at service scope" do
      cluster = insert(:cluster)

      {:ok, 1} = Clusters.create_runtime_services(%{services: [
        %{name: "ingress-nginx", version: "1.8.1"},
        %{name: "bogus", version: "2.0.0"}
      ]}, nil, cluster)

      [runtime] = Clusters.runtime_services(cluster)
      assert runtime.name == "ingress-nginx"
      assert runtime.version == "1.8.1"

      {:ok, 1} = Clusters.create_runtime_services(%{services: [
        %{name: "ingress-nginx", version: "1.9.1"},
        %{name: "bogus", version: "2.0.0"}
      ]}, nil, cluster)

      [runtime] = Clusters.runtime_services(cluster)
      assert runtime.name == "ingress-nginx"
      assert runtime.version == "1.9.1"

      svc = insert(:service, cluster: cluster)
      {:ok, 1} = Clusters.create_runtime_services(%{services: [
        %{name: "ingress-nginx", version: "1.9.1"},
        %{name: "bogus", version: "2.0.0"}
      ]}, svc.id, cluster)

      [runtime] = Clusters.runtime_services(cluster)
      assert runtime.name == "ingress-nginx"
      assert runtime.version == "1.9.1"
      assert runtime.service_id == svc.id
    end

    test "it can register deprecated custom resources too" do
      cluster = insert(:cluster)

      {:ok, 1} = Clusters.create_runtime_services(%{
        services: [
          %{name: "ingress-nginx", version: "1.8.1"},
          %{name: "bogus", version: "2.0.0"}
        ],
        deprecated: [
          %{group: "istio.io", version: "v1beta1", kind: "VirtualService", namespace: "default", name: "nginx", next_version: "v1"}
        ]
      }, nil, cluster)

      [runtime] = Clusters.runtime_services(cluster)
      assert runtime.name == "ingress-nginx"
      assert runtime.version == "1.8.1"

      %{deprecated_custom_resources: [dcr]} = Console.Repo.preload(cluster, [:deprecated_custom_resources])

      assert dcr.group == "istio.io"
      assert dcr.version == "v1beta1"
      assert dcr.kind == "VirtualService"
      assert dcr.namespace == "default"
      assert dcr.name == "nginx"
      assert dcr.next_version == "v1"
    end

    test "it can prune uneeded runtime services" do
      cluster = insert(:cluster)
      prune = insert(:runtime_service, name: "pruned", cluster: cluster)

      {:ok, 1} = Clusters.create_runtime_services(%{services: [
        %{name: "ingress-nginx", version: "1.8.1"},
        %{name: "bogus", version: "2.0.0"}
      ]}, nil, cluster)

      refute refetch(prune)
    end

    test "it can create with goofy semvers" do
      cluster = insert(:cluster)

      {:ok, 1} = Clusters.create_runtime_services(%{services: [
        %{name: "ingress-nginx", version: "v1.9.1"},
        %{name: "bogus", version: "2.0.0"}
      ]}, nil, cluster)

      [runtime] = Clusters.runtime_services(cluster)
      assert runtime.name == "ingress-nginx"
      assert runtime.version == "1.9.1"
    end
  end

  describe "#refresh_kubeconfig/2" do
    test "it will refresh for base capi clusters" do
      provider = insert(:cluster_provider)
      %{id: id} = cluster = insert(:cluster, provider: provider)
      expect(Clusters, :refresh_kubeconfig, fn %{id: ^id} -> :ok end)

      :ok = Clusters.refresh_kubeconfig(provider.namespace, cluster.name)
    end

    test "it will refresh for clusters created with credentials" do
      provider = insert(:cluster_provider)
      credential = insert(:provider_credential)
      %{id: id} = cluster = insert(:cluster, provider: provider, credential: credential)
      expect(Clusters, :refresh_kubeconfig, fn %{id: ^id} -> :ok end)

      :ok = Clusters.refresh_kubeconfig(credential.namespace, cluster.name)
    end
  end

  describe "#create_agent_migration/2" do
    test "admins can create agent migrations" do
      user = admin_user()

      {:ok, migration} = Clusters.create_agent_migration(%{ref: "agent-v0.3.30"}, user)

      assert migration.ref == "agent-v0.3.30"
      refute migration.completed

      assert_receive {:event, %PubSub.AgentMigrationCreated{item: ^migration}}
    end

    test "global writers can create agent migrations" do
      user = insert(:user)
      deployment_settings(write_bindings: [%{user_id: user.id}])

      {:ok, migration} = Clusters.create_agent_migration(%{ref: "agent-v0.3.30"}, user)

      assert migration.ref == "agent-v0.3.30"
      refute migration.completed

      assert_receive {:event, %PubSub.AgentMigrationCreated{item: ^migration}}
    end

    test "random users cannot create" do
      user = insert(:user)
      {:error, _} = Clusters.create_agent_migration(%{ref: "agent-v0.3.30"}, user)
    end
  end

  describe "#apply_migration/1" do
    test "it will rewire the git ref for all agent services in a fleet" do
      user = admin_user()
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, _} = Clusters.create_cluster(%{name: "test"}, user)
      {:ok, _} = Clusters.create_cluster(%{name: "test2"}, user)

      migration = insert(:agent_migration)
      {:ok, completed} = Clusters.apply_migration(migration)

      assert completed.id == migration.id
      assert completed.completed

      [first, second] = Console.Schema.Service.agent()
                        |> Console.Repo.all()

      assert first.git.ref == migration.ref
      assert second.git.ref == migration.ref
    end

    test "it can apply helm vals migrations" do
      user = admin_user()
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, _} = Clusters.create_cluster(%{name: "test"}, user)
      {:ok, _} = Clusters.create_cluster(%{name: "test2"}, user)

      migration = insert(:agent_migration, ref: nil, helm_values: "bogus: val")
      {:ok, completed} = Clusters.apply_migration(migration)

      assert completed.id == migration.id
      assert completed.completed

      [first, second] = Console.Schema.Service.agent()
                        |> Console.Repo.all()

      assert first.git.ref == Settings.agent_ref()
      assert first.helm.values == "bogus: val"
      assert second.git.ref == Settings.agent_ref()
      assert second.helm.values == "bogus: val"
    end

    test "it can migrate helm vals and ref" do
      user = admin_user()
      insert(:user, bot_name: "console", roles: %{admin: true})
      insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")

      {:ok, _} = Clusters.create_cluster(%{name: "test"}, user)
      {:ok, _} = Clusters.create_cluster(%{name: "test2"}, user)

      migration = insert(:agent_migration, ref: "some/ref", helm_values: "bogus: val")
      {:ok, completed} = Clusters.apply_migration(migration)

      assert completed.id == migration.id
      assert completed.completed

      [first, second] = Console.Schema.Service.agent()
                        |> Console.Repo.all()

      assert first.git.ref == "some/ref"
      assert first.helm.values == "bogus: val"
      assert second.git.ref == "some/ref"
      assert second.helm.values == "bogus: val"
    end
  end

  describe "#ping/2" do
    test "it can register a ping on a cluster" do
      cluster = insert(:cluster)

      {:ok, pinged} = Clusters.ping(%{distro: :eks, current_version: "1.25.1"}, cluster)

      assert pinged.current_version == "1.25.1"
      assert pinged.distro == :eks

      assert_receive {:event, %PubSub.ClusterPinged{item: ^pinged}}
    end

    test "it can persist cluster insight components and node statistics" do
      cluster = insert(:cluster)

      {:ok, pinged} = Clusters.ping(%{
        distro: :eks,
        current_version: "1.25.1",
        node_statistics: [
          %{name: "node-1", pending_pods: 1, health: :healthy},
          %{name: "node-2", pending_pods: 2, health: :failed}
        ],
        insight_components: [
          %{group: "apps", version: "v1", kind: "Deployment", name: "test"}
        ]
      }, cluster)

      assert pinged.current_version == "1.25.1"
      assert pinged.distro == :eks

      [first, second] = pinged.node_statistics

      assert first.name == "node-1"
      assert first.pending_pods == 1
      assert first.health == :healthy
      assert second.name == "node-2"
      assert second.pending_pods == 2
      assert second.health == :failed

      [insight] = pinged.insight_components

      assert insight.group == "apps"
      assert insight.version == "v1"
      assert insight.kind == "Deployment"
      assert insight.name == "test"

      assert_receive {:event, %PubSub.ClusterPinged{item: ^pinged}}
    end
  end

  describe "#install/1" do
    test "it can install the operator in a ready cluster" do
      %{name: n, provider: %{namespace: ns}, deploy_token: t} = cluster =
          insert(:cluster, provider: insert(:cluster_provider))
      kubeconf_secret = "#{n}-kubeconfig"
      expect(Console.Cached.Cluster, :get, fn ^ns, ^n -> cluster(n) end)
      expect(Kube.Utils, :get_secret, fn ^ns, ^kubeconf_secret ->
        {:ok, %CoreV1.Secret{data: %{"value" => Base.encode64("kubeconfig")}}}
      end)
      expect(Console.Commands.Command, :cmd_tee, fn "plural", ["deployments", "install", "--url", _, "--token", ^t, "--force", "--chart-loc", _], _, [{"KUBECONFIG", f}, {"PLURAL_INSTALL_AGENT_CONFIRM", "true"}] ->
        case File.read(f) do
          {:ok, "kubeconfig"} -> {:ok, "yay"}
          err -> {:error, err}
        end
      end)

      {:ok, installed} = Clusters.install(cluster)

      assert installed.installed

      %{service_errors: []} = Repo.preload(installed, [:service_errors])
    end

    test "it will persist errors if any" do
      %{name: n, provider: %{namespace: ns}, deploy_token: t} = cluster =
        insert(:cluster, provider: insert(:cluster_provider))
      kubeconf_secret = "#{n}-kubeconfig"
      expect(Console.Cached.Cluster, :get, fn ^ns, ^n -> cluster(n) end)
      expect(Kube.Utils, :get_secret, fn ^ns, ^kubeconf_secret ->
        {:ok, %CoreV1.Secret{data: %{"value" => Base.encode64("kubeconfig")}}}
      end)
      expect(Console.Commands.Plural, :install_cd, fn _, ^t, _, "kubeconfig" ->
        {:error, %Console.Commands.Tee{stdo: ["helm failure"]}}
      end)

      {:error, _} = Clusters.install(cluster)

      %{service_errors: [%{source: "bootstrap", message: msg}]} = Repo.preload(cluster, [:service_errors])
      assert msg == "helm failure"
    end
  end

  describe "#create_pinned_custom_resource/2" do
    test "admins can create a new pinned resource" do
      {:ok, pinned} = Clusters.create_pinned_custom_resource(%{
        kind: "ConstraintTemplate",
        group: "gatekeeper.sh",
        version: "v1beta1",
        name: "crd",
        namespaced: false,
        display_name: "Constraint Templates"
      }, admin_user())

      assert pinned.name == "crd"
      assert pinned.kind == "ConstraintTemplate"
      assert pinned.group == "gatekeeper.sh"
      assert pinned.version == "v1beta1"
      assert pinned.display_name == "Constraint Templates"
      refute pinned.namespaced
    end

    test "cluster writers can create a new pinned resource" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      {:ok, pinned} = Clusters.create_pinned_custom_resource(%{
        kind: "ConstraintTemplate",
        group: "gatekeeper.sh",
        version: "v1beta1",
        name: "crd",
        namespaced: false,
        display_name: "Constraint Templates",
        cluster_id: cluster.id
      }, user)

      assert pinned.kind == "ConstraintTemplate"
      assert pinned.group == "gatekeeper.sh"
      assert pinned.version == "v1beta1"
      assert pinned.display_name == "Constraint Templates"
      refute pinned.namespaced
    end

    test "non-writers cannot create" do
      {:error, _} = Clusters.create_pinned_custom_resource(%{
        kind: "ConstraintTemplate",
        group: "gatekeeper.sh",
        version: "v1beta1",
        namespaced: false,
        display_name: "Constraint Templates",
      }, insert(:user))
    end
  end

  describe "#delete_pinned_custom_resource/2" do
    test "admins can delete" do
      pcr = insert(:pinned_custom_resource)

      {:ok, deleted} = Clusters.delete_pinned_custom_resource(pcr.id, admin_user())

      assert deleted.id == pcr.id
      refute refetch(pcr)
    end
  end

  describe "#update_upgrade_plan/1" do
    test "it can update the upgrade plans for a cluster" do
      cluster = insert(:cluster)

      {:ok, updated} = Clusters.update_upgrade_plan(cluster)

      assert updated.id == cluster.id
      assert updated.upgrade_plan.deprecations
      assert updated.upgrade_plan.compatibilities
      assert updated.upgrade_plan.incompatibilities
    end
  end

  describe "#create_cluster_registration/2" do
    test "project writers can create registrations" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, reg} = Clusters.create_cluster_registration(%{machine_id: "blah", project_id: project.id}, user)

      assert reg.project_id == project.id
      assert reg.machine_id == "blah"
      assert reg.creator_id == user.id
    end

    test "bootstrap tokens can create registrations" do
      user = bootstrap_user()
      {:ok, reg} = Clusters.create_cluster_registration(%{machine_id: "blah"}, user)

      assert reg.project_id == user.bootstrap.project_id
      assert reg.machine_id == "blah"
      assert reg.creator_id == user.id
    end

    test "nonwriters cannot create" do
      user = insert(:user)
      project = insert(:project)

      {:error, _} = Clusters.create_cluster_registration(%{machine_id: "blah", project_id: project.id}, user)
    end

    test "it enforces machine id uniqueness" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, _} = Clusters.create_cluster_registration(%{machine_id: "blah", project_id: project.id}, user)
      {:error, _} = Clusters.create_cluster_registration(%{machine_id: "blah", project_id: project.id}, user)
    end
  end

  describe "#update_cluster_regstration/3" do
    test "project writers can update registrations" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      reg = insert(:cluster_registration, project: project)

      {:ok, reg} = Clusters.update_cluster_registration(%{
        name: "edge-1",
        tags: [%{name: "t", value: "v"}]
      }, reg.id, user)

      assert reg.name == "edge-1"
      assert reg.handle == "edge-1"
      [%{name: "t", value: "v"}] = reg.tags
    end

    test "you cannot chose existing cluster handles" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      reg = insert(:cluster_registration, project: project)
      insert(:cluster, handle: "edge-1")

      {:error, _} = Clusters.update_cluster_registration(%{
        name: "edge-1",
        tags: [%{name: "t", value: "v"}]
      }, reg.id, user)
    end

    test "nonwriters cannot update" do
      user = insert(:user)
      project = insert(:project)
      reg = insert(:cluster_registration, project: project)

      {:error, _} = Clusters.update_cluster_registration(%{
        name: "edge-1",
        tags: [%{name: "t", value: "v"}]
      }, reg.id, user)
    end
  end

  describe "#delete_cluster_registration/2" do
    test "creators can delete" do
      user = bootstrap_user()
      reg  = insert(:cluster_registration, creator: user)

      {:ok, del} = Clusters.delete_cluster_registration(reg.id, user)

      assert del.id == reg.id
      refute refetch(reg)
    end

    test "project writers can delete" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      reg = insert(:cluster_registration, project: project)

      {:ok, del} = Clusters.delete_cluster_registration(reg.id, user)

      assert del.id == reg.id
      refute refetch(reg)
    end

    test "nonwriters cannot delete" do
      user = insert(:user)
      project = insert(:project)
      reg = insert(:cluster_registration, project: project)

      {:error, _} = Clusters.delete_cluster_registration(reg.id, user)
    end
  end

  describe "#create_cluster_iso_image/2" do
    test "project writers can create isos" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, iso} = Clusters.create_cluster_iso_image(%{
        image: "image:1.2",
        registry: "dkr.plural.sh",
        project_id: project.id
      }, user)

      assert iso.project_id == project.id
      assert iso.image == "image:1.2"
      assert iso.registry == "dkr.plural.sh"
    end

    test "nonwriters cannot create" do
      user = insert(:user)
      project = insert(:project)

      {:error, _} = Clusters.create_cluster_iso_image(%{
        image: "image:1.2",
        registry: "dkr.plural.sh",
        project_id: project.id
      }, user)
    end
  end

  describe "#update_cluster_iso_image/3" do
    test "project writers can update registrations" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      iso = insert(:cluster_iso_image, project: project)

      {:ok, iso} = Clusters.update_cluster_iso_image(%{image: "image:latest"}, iso.id, user)

      assert iso.image == "image:latest"
    end

    test "nonwriters cannot update" do
      user = insert(:user)
      project = insert(:project)
      iso = insert(:cluster_iso_image, project: project)

      {:error, _} = Clusters.update_cluster_iso_image(%{image: "image:latest"}, iso.id, user)
    end
  end

  describe "#delete_cluster_iso_image/2" do
    test "creators can delete" do
      user = bootstrap_user()
      iso  = insert(:cluster_iso_image, creator: user, project: user.bootstrap.project)

      {:ok, del} = Clusters.delete_cluster_iso_image(iso.id, user)

      assert del.id == iso.id
      refute refetch(iso)
    end

    test "project writers can delete" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      iso = insert(:cluster_iso_image, project: project)

      {:ok, del} = Clusters.delete_cluster_iso_image(iso.id, user)

      assert del.id == iso.id
      refute refetch(iso)
    end

    test "nonwriters cannot delete" do
      user = insert(:user)
      project = insert(:project)
      iso = insert(:cluster_iso_image, project: project)

      {:error, _} = Clusters.delete_cluster_iso_image(iso.id, user)
    end
  end
end
