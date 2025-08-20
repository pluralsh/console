defimpl Console.PubSub.Recurse, for: Console.PubSub.GitRepositoryCreated do
  alias Console.Deployments.Git.Discovery
  def process(%{item: repo}), do: Discovery.start(repo)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ServiceComponentsUpdated do
  alias Console.Schema.{Service, ServiceComponent}
  alias Console.Deployments.{Services}

  def process(%{item: %Service{namespace: ns, deleted_at: del} = svc}) when not is_nil(del) do
    case Console.Repo.preload(svc, [:components]) do
      %Service{components: []} -> Services.hard_delete(svc)
      %Service{components: [%ServiceComponent{kind: "Namespace", name: ^ns}]} ->
        Services.hard_delete(svc)
      _ -> :ok
    end
  end
  def process(_), do: :ok
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ServiceCreated do
  alias Console.Schema.Service
  alias Console.Deployments.Helm.Charts

  def process(%{item: %Service{} = svc}), do: Charts.get(svc)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ServiceUpdated do
  alias Console.Deployments.Global
  alias Console.Deployments.Helm.Charts
  alias Console.Schema.{User, Service, GlobalService}

  def process(%{item: %Service{} = item, actor: %User{}}) do
    Charts.get(item)
    case Console.Repo.preload(item, [:global_service]) do
      %Service{global_service: %GlobalService{} = global} ->
        {:global, Global.sync_clusters(global)}
      _ -> :ok
    end
  end
  def process(_), do: :ok
end

defimpl Console.PubSub.Recurse, for: [Console.PubSub.ClusterCreated, Console.PubSub.ClusterUpdated] do
  alias Console.Deployments.Global

  def process(%{item: cluster}), do: Global.sync_cluster(cluster)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ClusterPinged do
  alias Console.Schema.Cluster
  alias Console.Deployments.Global

  def process(%{item: %Cluster{distro_changed: true} = cluster}),
    do: Global.sync_cluster(cluster)
  def process(_), do: :ok
end

defimpl Console.PubSub.Recurse, for: [Console.PubSub.GlobalServiceCreated, Console.PubSub.GlobalServiceUpdated] do
  alias Console.Deployments.Global

  def process(%{item: global}), do: Global.enqueue(global)
end

defimpl Console.PubSub.Recurse, for: [Console.PubSub.ManagedNamespaceCreated, Console.PubSub.ManagedNamespaceUpdated] do
  alias Console.Deployments.Global

  def process(%{item: ns}), do: Global.reconcile_namespace(ns)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ManagedNamespaceDeleted do
  alias Console.Deployments.Global

  def process(%{item: ns}), do: Global.drain_managed_namespace(ns)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ServiceHardDeleted do
  alias Console.Schema.{Service, Cluster}
  alias Console.Deployments.Clusters

  def process(%{item: %Service{cluster_id: id}}) do
    with {:cluster, %Cluster{deleted_at: del} = cluster} when not is_nil(del) <- {:cluster, Clusters.get_cluster(id)},
         {:draining, false} <- {:draining, Clusters.draining?(cluster)},
      do: Clusters.drained(cluster)
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.AgentMigrationCreated do
  alias Console.Deployments.Clusters

  def process(%{item: migration}), do: Clusters.apply_migration(migration)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.PipelineStageUpdated do
  alias Console.Deployments.Pipelines.Discovery

  def process(%{item: stage}) do
    Console.async_retry(fn -> Discovery.context(stage) end)
  end
end

defimpl Console.PubSub.Recurse, for: [Console.PubSub.PullRequestCreated, Console.PubSub.PullRequestUpdated] do
  alias Console.Repo
  alias Console.Schema.{PullRequest, Stack, Service}
  alias Console.Deployments.{Stacks, Git.Discovery, Services}

  def process(%@for{item: %PullRequest{status: :merged, stack_id: id} = pr}) when is_binary(id) do
    :timer.sleep(:timer.seconds(10))
    with %PullRequest{stack: %Stack{} = stack} <- Repo.preload(pr, [stack: :repository]),
         _ <- Discovery.kick(stack.repository),
      do: Stacks.poll(stack)
  end

  def process(%@for{item: %PullRequest{status: :merged, service_id: id} = pr}) when is_binary(id) do
    :timer.sleep(:timer.seconds(10))
    with %PullRequest{service: %Service{} = service} <- Repo.preload(pr, [service: :repository]),
      do: Services.kick(service)
  end

  def process(%@for{item: %PullRequest{stack_id: id} = pr}) when is_binary(id) do
    :timer.sleep(:timer.seconds(5))
    Console.debounce({:stack_pr, pr.id}, fn ->
      with %PullRequest{stack: %Stack{} = stack} = pr <- Repo.preload(pr, [stack: :repository]),
            _ <- Discovery.kick(stack.repository),
        do: Stacks.poll(pr)
    end, ttl: :timer.minutes(2))
  end

  def process(_), do: :ok
end

defimpl Console.PubSub.Recurse, for: [Console.PubSub.StackCreated, Console.PubSub.StackUpdated] do
  alias Console.Deployments.Stacks

  def process(%{item: stack}), do: Stacks.poll(stack)
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.StackDeleted do
  alias Console.Deployments.Stacks

  def process(%{item: stack}), do: Stacks.create_run(stack, stack.sha, %{message: "destroying stack #{stack.name}"})
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.StackRunUpdated do
  alias Console.Schema.{StackRun, PullRequest, StackState}
  alias Console.Deployments.Stacks

  def process(%{item: %{dry_run: true, status: :pending_approval} = run}) do
    case Console.Repo.preload(run, [:pull_request, :state]) do
      %StackRun{pull_request: %PullRequest{}, state: %StackState{plan: p}} = run when is_binary(p) ->
        Stacks.post_comment(run)
      _ -> :ok
    end
  end

  def process(%{item: %{status: status} = run}) when status in ~w(pending running)a,
    do: Console.Deployments.Stacks.Discovery.runner(run)

  def process(_), do: :ok
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.StackStateInsight do
  alias Console.Schema.{StackRun, PullRequest, StackState, AiInsight}
  alias Console.Deployments.Stacks

  def process(%@for{item: {%StackState{} = state, _}}) do
    case Console.Repo.preload(state, [run: [:pull_request, state: :insight]]) do
      %StackState{run: %StackRun{pull_request: %PullRequest{}, state: %StackState{insight: %AiInsight{}}} = run} ->
        Stacks.post_comment(run)
      _ -> :ok
    end
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.StackRunCreated do
  alias Console.Schema.{Stack, StackRun, PullRequest}
  alias Console.Deployments.Stacks

  def process(%{item: run}) do
    case Console.Repo.preload(run, [:stack, :pull_request]) do
      %StackRun{pull_request: %PullRequest{} = pr} ->
        Stacks.dequeue(pr)
      %StackRun{stack: %Stack{} = stack} ->
        Stacks.dequeue(stack)
      _ -> :ok
    end
  end
end

defimpl Console.PubSub.Recurse, for: [Console.PubSub.StackRunCompleted] do
  alias Console.Schema.{Stack, StackRun, PullRequest}
  alias Console.Deployments.Stacks

  def process(%{item: %StackRun{id: id} = run}) do
    case Console.Repo.preload(run, [:pull_request, :stack]) do
      %StackRun{stack: %Stack{delete_run_id: ^id} = stack, status: :successful} ->
        Console.Repo.delete(stack)
      %StackRun{pull_request: %PullRequest{} = pr} = run ->
        Stacks.post_comment(run)
        Stacks.dequeue(pr)
      %StackRun{stack: %Stack{} = stack} -> Stacks.dequeue(stack)
    end
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.PreviewEnvironmentTemplateUpdated do
  alias Console.Repo
  alias Console.Deployments.Flows.Preview
  alias Console.Schema.{PreviewEnvironmentTemplate, PreviewEnvironmentInstance}

  def process(%{item: %PreviewEnvironmentTemplate{id: id}}) do
    PreviewEnvironmentInstance.for_template(id)
    |> Repo.all()
    |> Preview.preload_instance()
    |> Enum.each(&Preview.update_instance(&1, &1.pull_request))
  end
end
