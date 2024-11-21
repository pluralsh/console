defmodule Console.Deployments.PubSub.RecurseTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.Deployments.{Clusters, Services, Global, Stacks}
  alias Console.Deployments.Git.Discovery
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
      global  = insert(:global_service, provider: cluster.provider, cascade: %{delete: true})
      global2 = insert(:global_service, tags: [%{name: "test", value: "tag"}])
      global3 = insert(:global_service)
      ignore  = insert(:global_service, tags: [%{name: "ignore", value: "tag"}])
      ignore1 = insert(:global_service, provider: insert(:cluster_provider))

      repo = insert(:git_repository)
      service_spec = %{repository_id: repo.id, git: %{ref: "main", folder: "runtime"}, name: "svc", namespace: "ns"}
      templated = insert(:global_service, template: service_spec)

      event = %PubSub.ClusterCreated{item: cluster}
      :ok = Recurse.handle_event(event)

      for gs <- [global, global2, global3],
        do: assert Services.get_service_by_name(cluster.id, gs.service.name)
      for gs <- [ignore, ignore1],
        do: refute Services.get_service_by_name(cluster.id, gs.service.name)

      res = Services.get_service_by_name(cluster.id, "svc")
      assert res.owner_id == templated.id
      assert res.name == "svc"
      assert res.namespace == "ns"
      assert res.repository_id == repo.id
      assert res.git.ref == "main"
      assert res.git.folder == "runtime"

      # run again to ensure idempotency
      :ok = Recurse.handle_event(event)

      for gs <- [global, global2, global3] do
        svc = Services.get_service_by_name(cluster.id, gs.service.name)
        assert svc
        refute svc.deleted_at
      end
      for gs <- [ignore, ignore1],
        do: refute Services.get_service_by_name(cluster.id, gs.service.name)

      res = Services.get_service_by_name(cluster.id, "svc")
      assert res.owner_id == templated.id
      assert res.name == "svc"
      assert res.namespace == "ns"
      assert res.repository_id == repo.id
      assert res.git.ref == "main"
      assert res.git.folder == "runtime"
      refute res.deleted_at
    end

    test "it will apply managed namespaces" do
      bot("console")
      repo = insert(:git_repository)
      service_spec = %{repository_id: repo.id, git: %{ref: "main", folder: "runtime"}}
      cluster = insert(:cluster, tags: [%{name: "test", value: "tag"}])
      mns1 = insert(:managed_namespace, target: %{tags: %{"test" => "tag"}}, service: service_spec)
      mns2 = insert(:managed_namespace, service: service_spec)
      ignore  = insert(:managed_namespace, target: %{tags: %{"not" => "matching"}}, service: service_spec)
      ignore1 = insert(:managed_namespace, target: %{distro: :aks})

      event = %PubSub.ClusterCreated{item: cluster}
      :ok = Recurse.handle_event(event)

      for mns <- [mns1, mns2],
        do: assert Services.get_service_by_name(cluster.id, "#{mns.name}-core")
      for mns <- [ignore, ignore1],
        do: refute Services.get_service_by_name(cluster.id, "#{mns.name}-core")
    end
  end

  describe "ClusterUpdated" do
    test "it will apply global services" do
      bot("console")
      cluster = insert(:cluster, tags: [%{name: "test", value: "tag"}])
      global  = insert(:global_service, provider: cluster.provider)
      global2 = insert(:global_service, tags: [%{name: "test", value: "tag"}])
      global3 = insert(:global_service)
      ignore  = insert(:global_service, tags: [%{name: "ignore", value: "tag"}], cascade: %{detach: true})
      ignore1 = insert(:global_service, provider: insert(:cluster_provider), cascade: %{delete: true})
      svc  = insert(:service, owner: ignore1, cluster: cluster)
      svc2 = insert(:service, owner: ignore, cluster: cluster)

      event = %PubSub.ClusterUpdated{item: cluster}
      :ok = Recurse.handle_event(event)

      for gs <- [global, global2, global3],
        do: assert Services.get_service_by_name(cluster.id, gs.service.name)
      for gs <- [ignore, ignore1],
        do: refute Services.get_service_by_name(cluster.id, gs.service.name)

      assert refetch(svc).deleted_at
      refute refetch(svc2)
    end

    test "it will apply managed namespaces" do
      bot("console")
      repo = insert(:git_repository)
      service_spec = %{repository_id: repo.id, git: %{ref: "main", folder: "runtime"}}
      cluster = insert(:cluster, tags: [%{name: "test", value: "tag"}])
      mns1 = insert(:managed_namespace, target: %{tags: %{"test" => "tag"}}, service: service_spec)
      mns2 = insert(:managed_namespace, service: service_spec)
      ignore  = insert(:managed_namespace, target: %{tags: %{"not" => "matching"}}, service: service_spec)
      ignore1 = insert(:managed_namespace, target: %{distro: :aks})

      event = %PubSub.ClusterUpdated{item: cluster}
      :ok = Recurse.handle_event(event)

      for mns <- [mns1, mns2],
        do: assert Services.get_service_by_name(cluster.id, "#{mns.name}-core")
      for mns <- [ignore, ignore1],
        do: refute Services.get_service_by_name(cluster.id, "#{mns.name}-core")
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

  describe "ManagedNamespaceDeleted" do
    test "it will begin draining the managed namespace" do
      bot("console")
      mns = insert(:managed_namespace, deleted_at: Timex.now())
      instances = insert_list(3, :namespace_instance, namespace: mns)

      event = %PubSub.ManagedNamespaceDeleted{item: mns}
      Recurse.handle_event(event)

      for inst <- instances,
        do: assert refetch(inst.service).deleted_at
    end
  end

  describe "ManagedNamespaceCreated" do
    test "it will setup the managed namespace" do
      bot("console")
      repo = insert(:git_repository)
      mns = insert(:managed_namespace,
        target: %{tags: %{"test" => "tag"}},
        service: %{repository_id: repo.id, git: %{ref: "main", folder: "runtime"}}
      )
      clusters = insert_list(2, :cluster, tags: [%{name: "test", value: "tag"}])
      ignore = insert(:cluster)
      ignore2 = insert(:cluster, tags: [%{name: "ignore", value: "tag"}])

      event = %PubSub.ManagedNamespaceCreated{item: mns}
      :ok = Recurse.handle_event(event)

      services = for c <- clusters do
        svc = Services.get_service_by_name(c.id, "#{mns.name}-core")
        assert svc
        svc
      end

      instances = Console.Schema.Service.for_namespace(mns.id)
                  |> Console.Repo.all()
      assert ids_equal(services, instances)

      for c <- [ignore, ignore2],
        do: refute Services.get_service_by_name(c.id, "#{mns.name}-core")
    end
  end

  describe "StackCreated" do
    test "it will poll the stack" do
      stack = insert(:stack, git: %{folder: "terraform", ref: "main"})
      expect(Discovery, :sha, fn _, _ -> {:ok, "new-sha"} end)
      expect(Discovery, :changes, fn _, _, _, _ -> {:ok, ["terraform/main.tf"], "a commit message"} end)

      event = %PubSub.StackCreated{item: stack}
      {:ok, run} = Recurse.handle_event(event)

      assert run.stack_id == stack.id
      assert run.status == :queued
      assert run.cluster_id == stack.cluster_id
      assert run.repository_id == stack.repository_id
      assert run.git.ref == "new-sha"
    end
  end

  describe "StackUpdated" do
    test "it will poll the stack" do
      stack = insert(:stack, git: %{folder: "terraform", ref: "main"})
      expect(Discovery, :sha, fn _, _ -> {:ok, "new-sha"} end)
      expect(Discovery, :changes, fn _, _, _, _ -> {:ok, ["terraform/main.tf"], "a commit message"} end)

      event = %PubSub.StackUpdated{item: stack}
      {:ok, run} = Recurse.handle_event(event)

      assert run.stack_id == stack.id
      assert run.status == :queued
      assert run.cluster_id == stack.cluster_id
      assert run.repository_id == stack.repository_id
      assert run.git.ref == "new-sha"
    end
  end

  describe "StackDeleted" do
    test "it will create a delete run" do
      stack = insert(:stack, deleted_at: Timex.now(), sha: "last-sha")

      event = %PubSub.StackDeleted{item: stack}
      {:ok, run} = Recurse.handle_event(event)

      assert run.git.ref == "last-sha"
      assert run.stack_id == stack.id
      assert run.message =~ "destroying stack #{stack.name}"

      %{steps: steps} = Console.Repo.preload(run, [:steps])
      %{"init" => init, "destroy" => destroy} = Map.new(steps, & {&1.name, &1})
      assert init.cmd == "terraform"
      assert init.args == ["init", "-upgrade"]

      assert destroy.cmd == "terraform"
      assert destroy.args == ["destroy", "-auto-approve"]

      assert refetch(stack).delete_run_id == run.id
    end
  end

  describe "StackStateInsight" do
    test "it can send a message on a stack plan insight" do
      insight = insert(:ai_insight)
      stack   = insert(:stack, connection: build(:scm_connection))
      pr      = insert(:pull_request, url: "https://github.com/pluralsh/console/pull/10")
      run     = insert(:stack_run, status: :successful, stack: stack, pull_request: pr)
      state   = insert(:stack_state, insight: insight, run: run)

      expect(Tentacat.Pulls.Reviews, :create, fn _, _, _, _, _ -> {:ok, %{"id" => "id"}, :ok} end)

      event = %PubSub.StackStateInsight{item: {state, insight}}
      Recurse.handle_event(event)
    end
  end

  describe "StackRunCompleted" do
    test "it can dequeue a stack run" do
      stack = insert(:stack)
      completed = insert(:stack_run, stack: stack, status: :successful)
      :timer.sleep(1)
      run = insert(:stack_run, stack: stack, status: :queued)

      event = %PubSub.StackRunCompleted{item: completed}
      {:ok, dequeued} = Recurse.handle_event(event)

      assert dequeued.id == run.id
      assert dequeued.status == :pending
    end

    test "it can delete a stack if it is in deleting stack" do
      stack = insert(:stack, deleted_at: Timex.now(), sha: "last-sha")

      {:ok, run} = Stacks.create_run(stack, stack.sha)

      event = %PubSub.StackRunCompleted{item: %{run | status: :successful}}
      {:ok, deleted} = Recurse.handle_event(event)

      assert deleted.id == stack.id
      refute refetch(stack)
    end
  end
end


defmodule Console.Deployments.PubSub.RecurseSyncTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.PubSub
  alias Console.PubSub.Consumers.Recurse

  setup :set_mimic_global

  describe "PipelineStageUpdated" do
    test "it will attempt to apply pr automations" do
      insert(:user, bot_name: "console", roles: %{admin: true})

      conn = insert(:scm_connection, token: "some-pat")
      pra = insert(:pr_automation,
        identifier: "pluralsh/console",
        cluster: build(:cluster),
        connection: conn,
        updates: %{regexes: ["regex"], match_strategy: :any, files: ["file.yaml"], replace_template: "replace"}
      )

      svc = insert(:service)
      pipe = insert(:pipeline, name: "my-pipeline")
      ctx = insert(:pipeline_context, context: %{some: "context"})
      dev = insert(:pipeline_stage, pipeline: pipe, name: "dev", context: ctx)
      ss = insert(:stage_service, service: svc, stage: dev)
      insert(:promotion_criteria, stage_service: ss, pr_automation: pra)

      expect(Console.Deployments.Pipelines.Discovery, :context, fn stage -> {:ok, stage} end)
      event = %PubSub.PipelineStageUpdated{item: dev}
      {:ok, stage} = Recurse.handle_event(event)

      assert stage.id == dev.id
    end
  end
end
