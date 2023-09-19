defmodule Console.Deployments.CronTest do
  use Console.DataCase, async: true
  alias Console.Deployments.{Cron, Clusters}

  describe "#prune_services/0" do
    test "it will wipe stale drained services" do
      svcs = insert_list(3, :service, deleted_at: Timex.now())
      ignore = insert(:service, deleted_at: Timex.now())
      ignore2 = insert(:service)
      insert_list(3, :service_component, service: ignore)

      :ok = Cron.prune_services()

      for svc <- svcs,
        do: refute refetch(svc)

      assert refetch(ignore)
      assert refetch(ignore2)
    end
  end

  describe "#prune_cluster/0" do
    test "it will wipe drained clusters" do
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

      {:ok, cluster} = Clusters.delete_cluster(cluster.id, user)

      {:ok, ignore} = Clusters.create_cluster(%{
        name: "ignore",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)
      {:ok, ignore} = Clusters.delete_cluster(ignore.id, user)
      insert(:service, cluster: ignore)

      {:ok, ignore2} = Clusters.create_cluster(%{
        name: "ignore2",
        version: "1.25",
        provider_id: provider.id,
        node_pools: [
          %{name: "pool", min_size: 1, max_size: 5, instance_type: "t5.large"}
        ]
      }, user)


      :ok = Cron.prune_clusters()

      %{service: svc} = Console.Repo.preload(cluster, [:service], force: true)
      assert svc.deleted_at

      %{service: svc} = Console.Repo.preload(ignore, [:service], force: true)
      refute svc.deleted_at

      %{service: svc} = Console.Repo.preload(ignore2, [:service], force: true)
      refute svc.deleted_at
      refute refetch(ignore2).deleted_at
    end
  end

  describe "#prune_revisions/0" do
    test "it will prune stale revisions for all services" do
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      git = insert(:git_repository)

      {:ok, service} = create_service(%{
        name: "my-service",
        namespace: "my-service",
        version: "0.0.1",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "name", value: "value"}]
      }, cluster, user)

      to_keep = Console.conf(:revision_history_limit) |> insert_list(:revision, service: service)
      to_kill = insert_list(3, :revision, service: service, inserted_at: Timex.now() |> Timex.shift(hours: -1))

      :ok = Cron.prune_revisions()

      for r <- to_keep,
        do: assert refetch(r)

      for r <- to_kill,
        do: refute refetch(r)
    end
  end

  describe "#backfill_deprecations/0" do
    test "it will backfill new api deprecations" do
      svc = insert(:service)
      component = insert(:service_component, service: svc, group: "extensions", version: "v1beta1", kind: "Ingress")

      :ok = Cron.backfill_deprecations()

      %{api_deprecations: [deprecation]} = Console.Repo.preload(component, [:api_deprecations])
      assert deprecation.replacement == "networking.k8s.io/v1"
    end
  end
end
