defmodule Console.Deployments.CronTest do
  use Console.DataCase, async: true
  use Mimic
  import KubernetesScaffolds
  alias Kazan.Apis.Core.V1, as: Core
  alias Console.Deployments.{Cron, Clusters, Services}


  describe "#prune_services/0" do
    test "it will wipe stale drained services" do
      svcs = insert_list(3, :service, deleted_at: Timex.now())
      prune = insert(:service, deleted_at: Timex.now())
      insert(:service_component, kind: "Namespace", namespace: prune.namespace)
      ignore = insert(:service, deleted_at: Timex.now())
      ignore2 = insert(:service)
      insert_list(3, :service_component, service: ignore)

      :ok = Cron.prune_services()

      for svc <- svcs,
        do: refute refetch(svc)

      refute refetch(prune)

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
      insert(:api_deprecation, component: component)
      :ok = Cron.backfill_deprecations()

      %{api_deprecations: [deprecation]} = Console.Repo.preload(component, [:api_deprecations])
      assert deprecation.replacement == "networking.k8s.io/v1"
    end
  end

  describe "#rotate_deploy_tokens/0" do
    test "it will remove old deploy tokens and rotate all current ones" do
      bot("console")
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

      dt = insert(:deploy_token, cluster: cluster)
      old = insert(:deploy_token, cluster: cluster, inserted_at: Timex.now() |> Timex.shift(days: -9))

      :ok = Cron.rotate_deploy_tokens()

      refute refetch(cluster).deploy_token == cluster.deploy_token
      assert refetch(dt)
      refute refetch(old)
    end
  end

  describe "#install_clusters/0" do
    test "it can install the operator into a provisioned cluster" do
      %{name: n, provider: %{namespace: ns}, deploy_token: t} = cluster =
        insert(:cluster, provider: insert(:cluster_provider))
      insert(:cluster, pinged_at: Timex.now())
      kubeconf_secret = "#{n}-kubeconfig"
      expect(Console.Cached.Cluster, :get, fn ^ns, ^n -> cluster(n) end)
      expect(Kube.Utils, :get_secret, fn ^ns, ^kubeconf_secret ->
        {:ok, %Core.Secret{data: %{"value" => Base.encode64("kubeconfig")}}}
      end)
      expect(Console.Commands.Plural, :install_cd, fn _, ^t, "kubeconfig" -> {:ok, "yay"} end)

      :ok = Cron.install_clusters()

      assert refetch(cluster).installed
    end
  end

  describe "#migrate_kas/0" do
    test "it will update kasAddress for deploy-operator services" do
      insert(:user, bot_name: "console", roles: %{admin: true})
      user = insert(:user)
      cluster = insert(:cluster, write_bindings: [%{user_id: user.id}])
      git = insert(:git_repository)

      {:ok, service} = create_service(%{
        name: "deploy-operator",
        namespace: "plrl-deploy-operator",
        repository_id: git.id,
        git: %{ref: "main", folder: "k8s"},
        configuration: [%{name: "kasAddress", value: "wss://bogus"}, %{name: "deployToken", value: "test-token"}]
      }, cluster, user)

      :ok = Cron.migrate_kas()

      svc = refetch(service)
      {:ok, %{"kasAddress" => new} = conf} = Services.configuration(svc)
      assert conf["deployToken"] == "test-token"
      assert new == Clusters.kas_url()
    end
  end

  describe "#cache_warm/0" do
    test "it can warm the cache for all registered clusters" do
      insert_list(3, :cluster)
      expect(Clusters, :warm, 12, fn
        :nodes, _ -> :ok
        :node_metrics, _ -> :ok
        :api_discovery, _ -> :ok
        :cluster_metrics, _ -> :ok
      end)

      :ok = Cron.cache_warm()
    end
  end

  describe "#poll_stacks/0" do
    test "it can generate new stack runs" do
      stack = insert(:stack,
        environment: [%{name: "ENV", value: "1"}], files: [%{path: "test.txt", content: "test"}],
        git: %{ref: "main", folder: "terraform"}
      )
      expect(Console.Deployments.Git.Discovery, :sha, fn _, _ -> {:ok, "new-sha"} end)
      expect(Console.Deployments.Git.Discovery, :changes, fn _, _, _, _ -> {:ok, ["terraform/main.tf"], "a commit message"} end)

      Cron.poll_stacks()

      [run] = Console.Schema.StackRun.for_stack(stack.id)
              |> Console.Repo.all()

      assert run.status == :queued
      assert run.stack_id == stack.id
    end
  end

  describe "#dequeue_stacks/0" do
    test "it can mark stack runs as pending" do
      stack = insert(:stack)
      insert(:stack_run, stack: stack, status: :successful)
      :timer.sleep(1)
      run = insert(:stack_run, stack: stack, status: :queued)

      Cron.dequeue_stacks()

      dequeued = refetch(run)
      assert dequeued.id == run.id
      assert dequeued.status == :pending
    end
  end

  describe "#prune_run_logs/0" do
    test "it can remove unnnecessary run logs" do
      rm = insert_list(3, :run_log, inserted_at: Timex.now() |> Timex.shift(days: -35))
      keep = insert_list(3, :run_log)

      Cron.prune_logs()

      for l <- rm, do: refute refetch(l)
      for l <- keep, do: assert refetch(l)
    end
  end

  describe "#prune_alerts/0" do
    test "it can remove old alerts" do
      rm = insert_list(3, :alert, inserted_at: Timex.now() |> Timex.shift(days: -3), updated_at: Timex.now() |> Timex.shift(days: -3))
      keep = insert_list(3, :alert)

      Cron.prune_alerts()

      for l <- rm, do: refute refetch(l)
      for l <- keep, do: assert refetch(l)
    end
  end

  describe "#spawn_stack_crons/0" do
    test "it can spawn cron runs for a stack" do
      crons = for _ <- 1..3,
        do: insert(:stack_cron, next_run_at: Timex.now() |> Timex.shift(minutes: -5), stack: build(:stack, sha: "sha"))
      ignore = for _ <- 1..3,
        do: insert(:stack_cron, next_run_at: Timex.now() |> Timex.shift(minutes: 5), stack: build(:stack, sha: "sha"))

      Cron.spawn_stack_crons()

      for c <- crons do
        assert refetch(c).last_run_at
      end

      for c <- ignore do
        refute refetch(c).last_run_at
      end
    end
  end

  describe "#prune_notifications/0" do
    test "it will wipe old read or really old unread notifications" do
      read = insert_list(2, :app_notification, read_at: Timex.now() |> Timex.shift(days: -8))
      unread = insert_list(2, :app_notification, inserted_at: Timex.now() |> Timex.shift(days: -40))
      ignore = insert_list(3, :app_notification)

      Cron.prune_notifications()

      for n <- read ++ unread,
        do: refute refetch(n)

      for n <- ignore,
        do: assert refetch(n)
    end
  end

  describe "#prune_cluster_audit_logs/0" do
    test "it will wipe old read or really old unread cluster_audit_logs" do
      keep   = insert_list(2, :cluster_audit_log, inserted_at: Timex.now() |> Timex.shift(days: -8))
      remove = insert_list(2, :cluster_audit_log, inserted_at: Timex.now() |> Timex.shift(days: -61))

      Cron.prune_cluster_audit_logs()

      for a <- remove, do: refute refetch(a)
      for a <- keep, do: assert refetch(a)
    end
  end
end
