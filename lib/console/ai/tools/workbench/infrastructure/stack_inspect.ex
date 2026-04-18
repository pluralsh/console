defmodule Console.AI.Tools.Workbench.Infrastructure.StackInspect do
  use Console.AI.Tools.Agent.Base
  alias Console.Repo
  alias Console.Deployments.{Policies, Stacks}
  alias Console.Schema.{Stack, StackRun, User, RunStep}

  require EEx

  embedded_schema do
    field :user, :map, virtual: true
    field :stack_id, :string
  end

  @valid ~w(stack_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> check_uuid(:stack_id)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/workbench/infrastructure/stack.json") |> Jason.decode!()

  def json_schema(_), do: @json_schema
  def name(_), do: "plrl_stack"
  def description(_), do: "Get detailed information about an infrastructure stack by id (from plrl_stacks)."

  def implement(_, %__MODULE__{user: %User{} = user, stack_id: id}) do
    Stacks.get_stack(id)
    |> Repo.preload([:repository, :cluster, :project, parent: [:cluster]])
    |> Policies.allow(user, :read)
    |> case do
      {:ok, stack} -> {:ok, String.trim(stack_prompt(stack: stack, failed_run: failed_run(stack)))}
      nil -> {:error, "could not find stack with id #{id}"}
      error -> error
    end
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
