defmodule Console.Deployments.PubSub.RecurseTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.{Clusters, Services, Global}
  alias Console.PubSub.Consumers.Recurse

  describe "ServiceComponentsUpdated" do
    test "it will hard delete if no components left" do
      svc = insert(:service, deleted_at: Timex.now())

      event = %PubSub.ServiceComponentsUpdated{item: svc}
      {:ok, deleted} = Recurse.handle_event(event)

      assert deleted.id == svc.id
      refute refetch(deleted)

      assert_receive {:event, %PubSub.ServiceHardDeleted{item: ^deleted}}
    end

    test "it will ignore if there are components" do
      svc = insert(:service, deleted_at: Timex.now())
      insert(:service_component, service: svc)

      event = %PubSub.ServiceComponentsUpdated{item: svc}
      :ok = Recurse.handle_event(event)
    end

    test "it will ignore if the service is live" do
      svc = insert(:service)

      event = %PubSub.ServiceComponentsUpdated{item: svc}
      :ok = Recurse.handle_event(event)
    end
  end

  describe "GitRepositoryCreated" do
    test "it will create a new git agent" do
      git = insert(:git_repository, url: "https://github.com/pluralsh/plural.git")
      expect(Console.Deployments.Git.Discovery, :start, fn ^git -> {:ok, self()} end)

      event = %PubSub.GitRepositoryCreated{item: git}
      {:ok, pid} = Recurse.handle_event(event)

      assert is_pid(pid)
    end
  end

  describe "ServiceHardDeleted" do
    test "if the cluster is now drained, delete its management service" do
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
      {:ok, _} = Clusters.delete_cluster(cluster.id, user)

      svc = insert(:service, cluster: cluster)
      {:ok, svc} = Console.Repo.delete(svc)

      event = %PubSub.ServiceHardDeleted{item: svc}
      {:ok, root} = Recurse.handle_event(event)

      assert root.id == cluster.service_id
      assert root.deleted_at
    end

    test "it will ignore clusters that are still draining" do
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
      {:ok, _} = Clusters.delete_cluster(cluster.id, user)

      insert(:service, cluster: cluster)
      svc = insert(:service, cluster: cluster)
      {:ok, svc} = Console.Repo.delete(svc)

      event = %PubSub.ServiceHardDeleted{item: svc}
      {:draining, true} = Recurse.handle_event(event)
    end

    test "it will ignore non-deleted clusters" do
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

      svc = insert(:service, cluster: cluster)
      {:ok, svc} = Console.Repo.delete(svc)

      event = %PubSub.ServiceHardDeleted{item: svc}
      {:cluster, found} = Recurse.handle_event(event)

      assert found.id == cluster.id
    end
  end

  describe "ServiceUpdated" do
    test "it will backfill sync all owned services" do
      bot("console")
      provider = insert(:cluster_provider)
      source = insert(:service, name: "source")
      global = insert(:global_service, service: source, provider: provider, tags: [%{name: "sync", value: "test"}])
      sync = insert(:cluster, provider: provider, tags: [%{name: "sync", value: "test"}])
      ignore1 = insert(:cluster, provider: provider)
      ignore2 = insert(:cluster, tags: [%{name: "sync", value: "test"}])

      event = %PubSub.ServiceUpdated{item: global.service, actor: insert(:user)}
      {:global, _} = Recurse.handle_event(event)

      refute Services.get_service_by_name(ignore1.id, "source")
      refute Services.get_service_by_name(ignore2.id, "source")

      synced = Services.get_service_by_name(sync.id, "source")
      refute Global.diff?(source, synced)
    end

    test "it will ignore if not a global service" do
      service = insert(:service)

      event = %PubSub.ServiceUpdated{item: service}
      :ok = Recurse.handle_event(event)
    end
  end

  describe "ClusterCreated" do
    test "it will apply global services" do
      bot("console")
      cluster = insert(:cluster, tags: [%{name: "test", value: "tag"}])
      global  = insert(:global_service, provider: cluster.provider)
      global2 = insert(:global_service, tags: [%{name: "test", value: "tag"}])
      global3 = insert(:global_service)
      ignore  = insert(:global_service, tags: [%{name: "ignore", value: "tag"}])
      ignore1 = insert(:global_service, provider: insert(:cluster_provider))

      event = %PubSub.ClusterCreated{item: cluster}
      :ok = Recurse.handle_event(event)

      for gs <- [global, global2, global3],
        do: assert Services.get_service_by_name(cluster.id, gs.service.name)
      for gs <- [ignore, ignore1],
        do: refute Services.get_service_by_name(cluster.id, gs.service.name)
    end
  end

  describe "ClusterPinged" do
    test "it will apply global services" do
      bot("console")
      cluster = insert(:cluster, distro: :eks, tags: [%{name: "test", value: "tag"}])
      global  = insert(:global_service, provider: cluster.provider)
      global2 = insert(:global_service, tags: [%{name: "test", value: "tag"}])
      global3 = insert(:global_service, distro: :eks)
      ignore  = insert(:global_service, tags: [%{name: "ignore", value: "tag"}])
      ignore1 = insert(:global_service, provider: insert(:cluster_provider))
      ignore2 = insert(:global_service, distro: :gke)

      event = %PubSub.ClusterCreated{item: cluster}
      :ok = Recurse.handle_event(event)

      for gs <- [global, global2, global3],
        do: assert Services.get_service_by_name(cluster.id, gs.service.name)
      for gs <- [ignore, ignore1, ignore2],
        do: refute Services.get_service_by_name(cluster.id, gs.service.name)
    end
  end

  describe "GlobalServiceCreated" do
    test "it will sync all relevant clusters" do
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

      event = %PubSub.GlobalServiceCreated{item: global}
      :ok = Recurse.handle_event(event)

      synced = Services.get_service_by_name(sync.id, "source")
      refute Global.diff?(source, synced)
    end
  end
end
