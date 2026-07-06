defmodule Console.AI.Workbench.Subagents.Plan do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.WorkbenchJob
  alias Console.AI.Workbench.Environment
  alias Console.AI.Tools.Workbench.{Skills, Skill, Plan, Subagents, Scratchpad}
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  @system Console.priv_file!("prompts/workbench/plan.md")

  def run(%WorkbenchJob{status: s} = job, _) when s != :pending, do: {:ok, job}
  def run(%WorkbenchJob{prompt: prompt} = job, %Environment{} = environment) do
    job = Repo.preload(job, [:result])

    tools(job, environment)
    |> MemoryEngine.new(20, engine_opts(job) ++ [system_prompt: @system, acc: %{}])
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, result: %{error: "error planning job: #{inspect(error)}"}}
    end
    |> then(&WorkbenchJob.changeset(job, &1))
    |> Repo.update()
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Plan{}, &1)) do
      %Plan{todos: todos} -> {:halt, %{
        status: :running,
        result: %{todos: Enum.map(todos, &Map.take(&1, [:name, :description, :done]))}
      }}
      _ -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp tools(%WorkbenchJob{} = job, %Environment{skills: skills}) do
    skills = Environment.subagent_skills(skills, :plan)

    [
      %Skills{skills: skills},
      %Skill{skills: skills},
      Scratchpad,
      %Subagents{
        subagents: Environment.subagents(job),
        categories: Environment.categories(job)
      },
      Plan
    ]
  end
end
