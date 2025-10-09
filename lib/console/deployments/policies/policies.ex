defmodule Console.Deployments.Policies do
  use Piazza.Policy
  import Console.Deployments.Policies.Rbac, only: [rbac: 3]
  alias Console.Repo
  alias Console.Deployments.{Services, Clusters, Global, BootstrapPolicies}
  alias Console.Schema.{
    User,
    Cluster,
    Service,
    PipelineGate,
    ClusterBackup,
    ClusterRestore,
    ManagedNamespace,
    StackRun,
    RunStep,
    RunLog,
    Stack,
    TerraformState,
    AiInsight,
    ServiceImport,
    BootstrapToken,
    AgentRuntime,
    AgentRun,
    SentinelRunJob
  }

  def can?(%User{bootstrap: %BootstrapToken{}} = user, res, action), do: BootstrapPolicies.can?(user, res, action)
  def can?(user, res, :token), do: can?(user, res, :write)

  def can?(%User{scopes: [_ | _] = scopes, api: api} = user, res, action) do
    res = resource(res)
    case Console.Users.AccessTokens.scopes_match?(scopes, api, Map.get(res, :id)) do
      true -> can?(%{user | scopes: nil}, res, action)
      false -> {:error, "token scopes not satisfied"}
    end
  end

  def can?(user, %AiInsight{} = insight, action) do
    case Repo.preload(insight, [:stack, :service]) do
      %{stack: %Stack{} = stack} -> can?(user, stack, action)
      %{service: %Service{} = svc} -> can?(user, svc, action)
      _ -> {:error, "forbidden"}
    end
  end

  def can?(user, %Ecto.Changeset{} = cs, action),
    do: can?(user, apply_changes(cs), action)

  def can?(user, %{read_bindings: r, write_bindings: w} = resource, :create) when r != [] and w != [],
      do: can?(user, Map.merge(resource, %{read_bindings: [], write_bindings: []}), :create)


  def can?(%Cluster{id: id}, %SentinelRunJob{cluster_id: id}, _), do: :pass
  def can?(%Cluster{id: id}, %AgentRuntime{cluster_id: id}, _), do: :pass

  def can?(%Cluster{id: id}, %AgentRun{} = run, _) do
    case Repo.preload(run, [:runtime]) do
      %AgentRun{runtime: %AgentRuntime{cluster_id: ^id}} -> :pass
      _ -> {:error, "forbidden"}
    end
  end

  def can?(%User{id: id}, %AgentRun{user_id: id}, _), do: :pass

  def can?(%Cluster{id: id}, %ClusterRestore{} = restore, :read) do
    case Repo.preload(restore, [:backup]) do
      %ClusterRestore{backup: %ClusterBackup{cluster_id: ^id}} -> :pass
      _ -> {:error,  "forbidden"}
    end
  end

  def can?(%User{}, %ManagedNamespace{}, :read), do: :pass
  def can?(%Cluster{} = cluster, %ManagedNamespace{} = ns, :read) do
    cluster = Repo.preload(cluster, [:tags])
    case Global.match?(ns, cluster) do
      true -> :pass
      _ -> {:error, "this namespace is not bound to the cluster"}
    end
  end

  def can?(%Cluster{id: id}, %Stack{cluster_id: id}, :state), do: :pass


  def can?(user, %TerraformState{lock_id: lock_id, lock: %{id: lock_id}} = state, :state),
    do: can?(user, %{state | lock_id: nil}, :state)

  def can?(_, %TerraformState{lock_id: id, lock: lock}, :state) when is_binary(id),
    do: {:error, {:locked, lock || %{}}}
  def can?(%User{} = user, %Stack{} = stack, :state), do: can?(user, stack, :write)

  def can?(%Cluster{id: id}, %StackRun{cluster_id: id}, _), do: :pass

  def can?(%Cluster{} = cluster, %RunStep{} = step, action) do
    %{run: run} = Repo.preload(step, [:run])
    can?(cluster, run, action)
  end

  def can?(%Cluster{} = cluster, %RunLog{} = step, action) do
    %{step: step} = Repo.preload(step, [step: :run])
    can?(cluster, step, action)
  end

  def can?(%Cluster{id: id}, %PipelineGate{cluster_id: id}, :read),
    do: :pass

  def can?(%Cluster{id: id}, %PipelineGate{cluster_id: id}, :update),
    do: :pass
  def can?(_, %PipelineGate{}, :update), do: {:error, "forbidden"}

  def can?(%Cluster{}, %PipelineGate{}, _), do: {:error, "forbidden"}

  def can?(%User{} = user, %PipelineGate{type: :approval} = g, :approve),
    do: can?(user, g, :write)
  def can?(_, %PipelineGate{}, :approve), do: {:error, "only approval gates can be approved"}

  def can?(%User{} = user, %Service{} = svc, :secrets),
    do: can?(user, %{svc | deleted_at: nil}, :write)
  def can?(%Cluster{id: id}, %Service{cluster_id: id}, :secrets), do: :pass
  def can?(%Cluster{id: id}, %Service{cluster_id: id}, :read), do: :pass

  def can?(actor, %TerraformState{} = state, :state) do
    %{stack: stack} = Repo.preload(state, [:stack])
    can?(actor, stack, :state)
  end

  def can?(%User{} = user, %ClusterBackup{cluster: %Cluster{} = cluster}, action),
    do: can?(user, cluster, action)

  def can?(%User{} = user, %Cluster{} = cluster, :view) do
    case can?(user, cluster, :read) do
      {:error, _} = err -> if Clusters.accessible_service?(cluster, user), do: :pass, else: err
      _ -> :pass
    end
  end

  def can?(%User{} = user, %ServiceImport{stack: %Stack{} = stack}, action), do: can?(user, stack, action)

  def can?(_, %Cluster{self: true}, :delete), do: {:error, "cannot delete the management cluster"}
  def can?(_, %Cluster{protect: true}, :delete), do: {:error, "this cluster has deletion protection enabled"}
  def can?(_, %Service{protect: true}, :delete), do: {:error, "this service has deletion protection enabled"}
  def can?(_, %Service{name: "deploy-operator"}, :delete),
    do: {:error, "cannot delete the deploy operator"}
  def can?(user, %Service{} = service, :delete) do
    case Services.referenced?(service.id) do
      true -> {:error, "cannot delete a cluster or provider service"}
      _ -> can?(user, %{service | deleted_at: nil}, :write)
    end
  end
  def can?(u, resource, :delete), do: can?(u, %{resource | deleted_at: nil}, :write)
  def can?(_, %ManagedNamespace{deleted_at: del}, :write) when not is_nil(del),
    do: {:error, "namespace deleting"}
  def can?(_, %Cluster{deleted_at: del}, :write) when not is_nil(del),
    do: {:error, "cluster deleting"}
  def can?(_, %Service{deleted_at: del}, :write) when not is_nil(del),
    do: {:error, "service deleting"}

  def can?(%User{roles: %{admin: true}}, _, _), do: :pass

  def can?(%User{id: id} = user, %Stack{actor_id: id, actor_changed: true} = stack, action),
    do: can?(user, %{stack | actor_changed: false}, action)

  def can?(_, %Stack{actor_changed: true}, :write),
    do: {:error, "you can only set yourself as actor unless you're an admin"}

  def can?(%User{} = user, %Stack{} = stack, :create) do
    %{cluster: %Cluster{} = cluster} = Repo.preload(stack, [:cluster])

    rbac(stack, user, :write) && can?(user, cluster, :write)
  end

  def can?(%User{} = user, %User{service_account: true} = sa, :assume), do: rbac(sa, user, :assume)

  def can?(%User{} = user, resource, action),
    do: rbac(resource, user, action)


  def can?(_, _, _), do: {:error, :forbidden}

  defp resource(%Ecto.Changeset{} = cs), do: apply_changes(cs)
  defp resource(res), do: res
end
