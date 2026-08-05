defmodule Console.AI.Tools.Workbench.Infrastructure.StackInspect do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Deployments.{Policies, Stacks}
  alias Console.Schema.{Stack, StackRun, StackState, User, RunStep}
  alias Console.AI.Tools.Workbench.Infrastructure.SideloadQuery

  require EEx

  embedded_schema do
    field :user,     :map, virtual: true
    field :stack_id, :string

    embeds_one :resources, SideloadQuery, on_replace: :update
  end

  @valid ~w(stack_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:resources)
    |> check_uuid(:stack_id)
    |> validate_required([:stack_id])
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/stack.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_stack"
  def description(_), do: "Get detailed information about an infrastructure stack by id (from plrl_stacks)."

  def implement(%__MODULE__{user: %User{} = user, stack_id: id} = model) do
    Stacks.get_stack(id)
    |> Repo.preload([:repository, :cluster, :project, parent: [:cluster]])
    |> Policies.allow(user, :read)
    |> case do
      {:ok, stack} ->
        {:ok,
         String.trim(
           stack_prompt(
             stack: stack,
             failed_run: failed_run(stack),
             resources: sideload_resources(stack, model.resources)
           )
         )}

      nil -> {:error, "could not find stack with id #{id}"}
      error -> error
    end
  end

  defp sideload_resources(%Stack{} = stack, %SideloadQuery{fetch: true} = query) do
    stack
    |> Repo.preload(:state)
    |> case do
      %Stack{state: %StackState{state: [_ | _] = state}} -> state
      _ -> []
    end
    |> SideloadQuery.filter(query, &resource_search_targets/1)
    |> Enum.map(&Console.mapify/1)
  end
  defp sideload_resources(_, _), do: []

  defp resource_search_targets(resource) do
    [
      resource.identifier,
      resource.resource,
      resource.name,
      Jason.encode!(resource.configuration || %{}),
      Enum.join(resource.links || [], " "),
      Enum.join([resource.identifier, resource.resource, resource.name], "/")
    ]
  end

  defp failed_run(%Stack{status: :failed, id: sid}) do
    with %StackRun{} = run <- Stacks.last_failed_run(sid),
         %RunStep{} = step <- failing_step(run) do
      build_failed_run(run, step)
    end
  end
  defp failed_run(_), do: nil

  defp build_failed_run(%StackRun{} = run, %RunStep{} = step) do
    %{
      run_id: run.id,
      run_message: run.message,
      run_errors: Enum.map(run.errors || [], & %{source: &1.source, message: &1.message}),
      failing_step: step
    }
  end

  defp failing_step(%StackRun{steps: steps}) when is_list(steps) do
    steps
    |> Enum.filter(&(&1.status == :failed))
    |> Enum.sort_by(& &1.index, :desc)
    |> List.first()
  end

  EEx.function_from_file(
    :defp,
    :stack_prompt,
    Path.join(:code.priv_dir(:console), "prompts/workbench/infrastructure/stack.md.eex"),
    [:assigns]
  )
end
