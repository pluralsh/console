defmodule Console.Deployments.PubSub.RecurseTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.Clusters
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
end
