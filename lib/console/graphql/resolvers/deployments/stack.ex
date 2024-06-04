defmodule Console.GraphQl.Resolvers.Deployments.Stack do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Stacks, Services, Settings}
  alias Console.Schema.{
    Stack,
    StackRun,
    PullRequest,
    CustomStackRun,
    DeploymentSettings
  }

  def list_stacks(args, %{context: %{current_user: user}}) do
    Stack.for_user(user)
    |> maybe_search(Stack, args)
    |> Stack.ordered()
    |> paginate(args)
  end

  def list_stack_runs(stack, args, _) do
    StackRun.for_stack(stack.id)
    |> filters(args)
    |> StackRun.ordered()
    |> paginate(args)
  end

  defp filters(query, %{pull_request_id: id}) when is_binary(id), do: StackRun.for_pr(query, id)
  defp filters(query, _), do: query

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

  def resolve_stack(%{id: id}, ctx) do
    Stacks.get_stack!(id)
    |> allow(actor(ctx), :read)
  end

  def resolve_stack_run(%{id: id}, ctx) do
    Stacks.get_run!(id)
    |> allow(actor(ctx), :read)
  end

  def resolve_run_step(step_id, %{context: %{current_user: user}}) do
    Stacks.get_step!(step_id)
    |> allow(user, :read)
  end

  def create_stack(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Stacks.create_stack(attrs, user)

  def update_stack(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Stacks.update_stack(attrs, id, user)

  def delete_stack(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.delete_stack(id, user)

  def detach_stack(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.detach_stack(id, user)

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

  def create_stack_run(%{stack_id: id, commands: commands}, %{context: %{current_user: user}}),
    do: Stacks.create_custom_run(id, commands, user)

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
