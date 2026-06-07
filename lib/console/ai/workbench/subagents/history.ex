defmodule Console.AI.Workbench.Subagents.History do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity}
  alias Console.AI.Tools.Workbench.{Result, Skills, Skill, Search, Scratchpad}
  alias Console.AI.Workbench.{Environment}
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt} = job, %Environment{} = environment) do
    tools(environment, job)
    |> MemoryEngine.new(20,
      engine_opts(job) ++ [
        system_prompt: &String.trim(system_prompt(prompt: jprompt, engine: &1)),
        acc: %{},
        callback: &callback(activity, &1),
        continue_msg: cont_msg()
      ]
    )
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, result: %{error: "error running memory subagent: #{inspect(error)}"}}
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Result{}, &1)) do
      %Result{output: output} -> {:halt, %{
        status: :successful,
        result: %{output: output}
      }}
      _ -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp tools(%Environment{skills: skills}, job) do
    job = Repo.preload(job, [referenced_job: [activities: :thoughts]])
    [
      %Skills{skills: Environment.subagent_skills(skills, :memory)},
      %Skill{skills: Environment.subagent_skills(skills, :memory)},
      Scratchpad,
      %Search{activities: job.referenced_job.activities},
      Result
    ]
  end

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "memory.md.eex"]), [:assigns])
end
