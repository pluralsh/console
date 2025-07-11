defmodule Console.AI.Tools.Agent.Coding.StackFiles do
  use Console.AI.Tools.Agent.Base
  alias Console.Schema.{Stack, User, AgentSession, PullRequest}
  alias Console.Deployments.Stacks
  alias Console.AI.Fixer.Stack, as: StackFixer

  embedded_schema do
    field :stack_id, :string
  end

  @valid ~w(stack_id)a

  def changeset(model, attrs) do
    model
    |> cast(attrs, @valid)
    |> validate_required(@valid)
  end

  @json_schema Console.priv_file!("tools/agent/coding/stack_files.json") |> Jason.decode!()

  def json_schema(), do: @json_schema
  def name(), do: plrl_tool("stack_files")
  def description(), do: "Finds the terraform files for a stack and renders them as a yaml list"

  def implement(%__MODULE__{stack_id: id}) do
    Console.AI.Fixer.Base.raw()
    with %Stack{} = stack <- Stacks.get_stack(id),
         %User{} = user <- Tool.actor(),
         {:ok, stack} <- Policies.allow(stack, user, :write),
         {:ok, [_ | rest]} <- get_prompt(stack) do
      Enum.map(rest, fn {:user, raw} -> raw end)
      |> Jason.encode()
    else
      {:error, err} -> {:error, "failed to get stack files, reason: #{inspect(err)}"}
      nil -> {:error, "could not find stack with id #{id}"}
    end
  end

  defp get_prompt(%Stack{} = stack) do
    with {:session, %AgentSession{} = session} <- session() do
      case Console.Repo.preload(session, [:pull_request]) do
        %AgentSession{pull_request: %PullRequest{} = pr} ->
          StackFixer.pr_prompt(stack, pr)
        _ -> StackFixer.healthy_prompt(stack)
      end
    else
      _ -> {:error, "could not find session"}
    end
  end
end
