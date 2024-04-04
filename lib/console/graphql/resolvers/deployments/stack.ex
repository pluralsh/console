defmodule Console.GraphQl.Resolvers.Deployments.Stack do
  use Console.GraphQl.Resolvers.Deployments.Base
  alias Console.Deployments.{Stacks, Services}
  alias Console.Schema.{
    Stack,
    StackRun
  }

  def list_stacks(args, %{context: %{current_user: user}}) do
    Stack.for_user(user)
    |> Stack.ordered()
    |> paginate(args)
  end

  def list_stack_runs(stack, args, _) do
    StackRun.for_stack(stack.id)
    |> StackRun.ordered()
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

  def create_stack(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Stacks.create_stack(attrs, user)

  def update_stack(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Stacks.update_stack(attrs, id, user)

  def delete_stack(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.delete_stack(id, user)

  def update_stack_run(%{id: id, attributes: attrs}, ctx),
    do: Stacks.update_stack_run(attrs, id, actor(ctx))

  def complete_stack_run(%{id: id, attributes: attrs}, ctx),
    do: Stacks.complete_stack_run(attrs, id, actor(ctx))

  def approve_stack_run(%{id: id}, %{context: %{current_user: user}}),
    do: Stacks.approve_stack_run(id, user)

  def update_run_step(%{id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Stacks.update_run_step(attrs, id, cluster)

  def add_run_logs(%{step_id: id, attributes: attrs}, %{context: %{cluster: cluster}}),
    do: Stacks.add_run_logs(attrs, id, cluster)

  def stack_tarball(%{id: id}, _, _), do: {:ok, Services.api_url("v1/git/stacks/tarballs?id=#{id}")}
end
