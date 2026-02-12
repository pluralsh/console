defmodule Console.AI.Workbench.Subagents.Plan do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.WorkbenchJob
  alias Console.AI.Workbench.Environment
  alias Console.AI.Tools.Workbench.{Skills, Skill, Plan, Subagents}

  @system Console.priv_file!("prompts/workbench/plan.md")

  def run(%WorkbenchJob{status: s} = job, _) when s != :pending, do: {:ok, job}
  def run(%WorkbenchJob{prompt: prompt} = job, %Environment{} = environment) do
    tools(job, environment)
    |> MemoryEngine.new(20, system_prompt: @system, acc: %{})
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, error: "error planning job: #{inspect(error)}"}
    end
    |> then(&WorkbenchJob.changeset(job, &1))
    |> Console.Repo.update()
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Plan{}, &1)) do
      %Plan{todos: todos} -> {:halt, %{
        status: :running,
        result: %{todos: Enum.map(todos, &Map.take(&1, [:title, :description, :done]))}
      }}
      _ -> last_message(messages, & {:cont, %{status: :failed, error: &1}})
    end
  end

  defp tools(%WorkbenchJob{} = job, %Environment{skills: skills}) do
    [
      %Skills{skills: skills},
      %Skill{skills: skills},
      %Subagents{subagents: Environment.subagents(job)},
      Plan
    ]
  end
end
