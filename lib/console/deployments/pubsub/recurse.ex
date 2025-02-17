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

  def process(%{item: global}), do: Global.sync_clusters(global)
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
  alias Console.Schema.{PullRequest, Stack}
  alias Console.Deployments.{Stacks, Git.Discovery}
  alias Console.Deployments.Notifications.Utils

  def process(%{item: %PullRequest{stack_id: id} = pr}) when is_binary(id) do
    Utils.deduplicate({:stack_pr, pr.id}, fn ->
      with %PullRequest{stack: %Stack{} = stack} = pr <- Console.Repo.preload(pr, [stack: :repository]),
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

  def process(%{item: %{id: id} = run}) do
    run = Console.Repo.preload(run, [:pull_request])
    case {Stacks.get_stack!(run.stack_id), run} do
      {%Stack{delete_run_id: ^id} = stack, %StackRun{status: :successful}} ->
        Console.Repo.delete(stack)
      {_, %StackRun{pull_request: %PullRequest{} = pr} = run} ->
        Stacks.post_comment(run)
        Stacks.dequeue(pr)
      {stack, _} -> Stacks.dequeue(stack)
    end
  end
end

defimpl Console.PubSub.Recurse, for: Console.PubSub.ScmWebhook do
  alias Console.AI.{Tool, VectorStore}
  alias Console.Deployments.{Pr.Dispatcher, Settings}
  alias Console.Schema.{ScmWebhook, ScmConnection, DeploymentSettings}

  def process(%@for{
    item: %{"action" => "pull_request", "pull_request" => %{"merged" => true} = pr},
    actor: %ScmWebhook{type: :github}
  }) do
    with true <- enabled?(),
         %ScmConnection{} = conn <- Tool.scm_connection(),
         {:ok, [_ | _] = files} <- Dispatcher.files(conn, pr) do
      Enum.each(files, &VectorStore.insert/1)
    end
  end
  def process(_), do: :ok

  defp enabled?() do
    case Settings.cached() do
      %DeploymentSettings{ai: %{vector_store: %{enabled: enabled}}} -> enabled
      _ -> false
    end
  end
end
