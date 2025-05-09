defmodule Console.GraphQl.Resolvers.Deployments.Stack do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Stacks, Services, Settings}
  alias Console.Schema.{
    Stack,
    StackRun,
    PullRequest,
    CustomStackRun,
    DeploymentSettings,
    StackDefinition
  }

  def list_stacks(args, %{context: %{current_user: user}}) do
    Stack.for_user(user)
    |> stack_filters(args)
    |> maybe_search(Stack, args)
    |> Stack.distinct()
    |> Stack.ordered()
    |> paginate(args)
  end

  def list_stack_runs(stack, args, _) do
    StackRun.for_stack(stack.id)
    |> filters(args)
    |> StackRun.ordered()
    |> paginate(args)
  end

  def list_stack_definitions(args, _) do
    StackDefinition.ordered()
    |> paginate(args)
  end

  def safe_stack_outputs(%{cluster_id: id}, outputs, %{context: %{cluster: %{id: id}}}), do: {:ok, outputs}
  def safe_stack_outputs(parent, outputs, ctx) do
    case allow(parent, actor(ctx), :write) do
      {:ok, _} -> outputs
      _ -> Enum.filter(outputs, & ! &1.secret)
    end
  end
  def safe_stack_outputs(_, _), do: {:error, "you are not allowed to read this field"}


  def safe_stack_field(%{cluster_id: id}, val, %{context: %{cluster: %{id: id}}}), do: {:ok, val}
  def safe_stack_field(parent, val, ctx) do
    case allow(parent, actor(ctx), :write) do
      {:ok, _} -> val
      _ -> {:error, "you are not allowed to read this field"}
    end
  end
  def safe_stack_field(_, _), do: {:error, "you are not allowed to read this field"}

  def safe_field(%{cluster_id: id} = parent, field, %{context: %{cluster: %{id: id}}}), do: {:ok, Map.get(parent, field)}
  def safe_field(parent, field, ctx) do
    case allow(parent, actor(ctx), :write) do
      {:ok, _} -> {:ok, Map.get(parent, field)}
      _ -> {:error, "you are not allowed to read this field"}
    end
  end
  def safe_field(_, _), do: {:error, "you are not allowed to read this field"}

  defp stack_filters(query, args) do
    Enum.reduce(args, query, fn
      {:project_id, id}, q -> Stack.for_project(q, id)
      {:tag_query, tq}, q -> Stack.with_tag_query(q, tq)
      _, q -> q
    end)
  end

  defp filters(query, %{pull_request_id: id}) when is_binary(id), do: StackRun.for_pr(query, id)
  defp filters(query, _), do: StackRun.without_pr(query)

  def list_prs_for_stack(stack, args, _) do
    PullRequest.for_stack(stack.id)
    |> PullRequest.ordered()
    |> paginate(args)
  end

  def list_custom_runs(stack, args, _) do
    CustomStackRun.for_stack(stack.id)
    |> paginate(args)
  end

  def stack_runs_for_cluster(args, %{context: %{cluster: cluster}}) do
    StackRun.for_cluster(cluster.id)
    |> StackRun.pending()
    |> StackRun.ordered()
    |> paginate(args)
  end

  def resolve_stack_definition(%{id: id}, _), do: {:ok, Stacks.get_definition!(id)}

  def resolve_stack(%{id: id}, ctx) when is_binary(id) do
    Stacks.get_stack!(id)
    |> allow(actor(ctx), :read)
  end

  def resolve_stack(%{name: name}, ctx) when is_binary(name) do
    Stacks.get_stack_by_name!(name)
    |> allow(actor(ctx), :read)
  end

  def resolve_stack(_, _), do: {:error, "you must specify either an id or name"}

  def resolve_stack_run(%{id: id}, ctx) do
    Stacks.get_run!(id)
    |> allow(actor(ctx), :read)
  end

  def resolve_run_step(step_id, %{context: %{current_user: user}}) do
    Stacks.get_step!(step_id)
    |> allow(user, :read)
  end

  def resolve_custom_stack_run(%{id: id}, %{context: %{current_user: user}}) do
    Stacks.get_custom_run!(id)
    |> allow(user, :read)
  end

  def state_file(state, _, %{context: %{current_user: user}}) do
    %{stack: stack} = Console.Repo.preload(state, :stack)
    with {:ok, _} <- allow(stack, user, :write) do
      {:ok, state.state}
    end
  end

  def create_stack(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Stacks.create_stack(attrs, user)

  def update_stack(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Stacks.update_stack(attrs, id, user)

  def delete_stack(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.delete_stack(id, user)

  def detach_stack(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.detach_stack(id, user)

  def restore_stack(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.restore_stack(id, user)

  def kick_stack_pr(%{id: id}, %{context: %{current_user: user}}) do
    Console.Repo.get!(PullRequest, id)
    |> Stacks.kick(user)
  end

  def kick_stack(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.kick(id, user)

  def update_stack_run(%{id: id, attributes: attrs}, ctx),
    do: Stacks.update_stack_run(attrs, id, actor(ctx))

  def complete_stack_run(%{id: id, attributes: attrs}, ctx),
    do: Stacks.complete_stack_run(attrs, id, actor(ctx))

  def approve_stack_run(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.approve_stack_run(id, user)

  def restart_stack_run(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.restart_run(id, user)

  def update_run_step(%{id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Stacks.update_run_step(attrs, id, cluster)

  def add_run_logs(%{step_id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Stacks.add_run_logs(attrs, id, cluster)

  def create_custom_stack_run(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Stacks.create_custom_stack_run(attrs, user)

  def update_custom_stack_run(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Stacks.update_custom_stack_run(attrs, id, user)

  def delete_custom_stack_run(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.delete_custom_stack_run(id, user)

  def create_stack_definition(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Stacks.create_stack_definition(attrs, user)

  def update_stack_definition(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Stacks.update_stack_definition(attrs, id, user)

  def delete_stack_definition(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.delete_stack_definition(id, user)

  def create_stack_run(%{stack_id: id, commands: commands} = args, %{context: %{current_user: user}}),
    do: Stacks.create_custom_run(id, commands, args[:context], user)

  def trigger_run(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.trigger_run(id, user)

  def job_spec(%StackRun{job_spec: %{} = spec}, _, _), do: {:ok, spec}
  def job_spec(_, _, _) do
    case Settings.cached() do
      %DeploymentSettings{stacks: %{job_spec: %{} = spec}} -> {:ok, spec}
      _ -> {:ok, nil}
    end
  end

  def stack_tarball(%{id: id}, _, _), do: {:ok, Services.api_url("v1/git/stacks/tarballs?id=#{id}")}

  def plural_creds(run, _, ctx), do: Stacks.plural_creds(run, actor(ctx))
end
