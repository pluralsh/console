defmodule Console.AI.Workbench.Subagents.SelfService do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity}
  alias Console.AI.Tools.Agent.{Catalogs, PrAutomations}
  alias Console.AI.Tools.Workbench.{
    History,
    Result,
    Scratchpad,
    Coding.PullRequests
  }
  alias Console.AI.Tools.Workbench.SelfService.{
    CatalogSearch,
    GetPrAutomation,
    InvokePrAutomation
  }
  alias Console.AI.Workbench.Environment
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{} = job, %Environment{} = environment) do
    tools(environment)
    |> MemoryEngine.new(20,
      engine_opts(environment) ++ [
        system_prompt: String.trim(system_prompt(prompt: WorkbenchJob.objective(job))),
        acc: %{},
        callback: &callback(activity, environment, &1),
        continue_msg: cont_msg()
      ]
    )
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, result: %{error: "error running self-service subagent: #{inspect(error)}"}}
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

  def tools(%Environment{skills: skills, job: job, activities: activities}) do
    skills = Environment.subagent_skills(skills, :self_service)

    [
      Catalogs,
      PrAutomations,
      CatalogSearch,
      GetPrAutomation,
      %InvokePrAutomation{job: job},
      %PullRequests{job: job}
    ]
    |> Enum.concat(skill_knowledge_tools(job, skills) ++ [
      Scratchpad,
      %History{job: job, activities: activities},
      Result
    ])
  end

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "self_service.md.eex"]), [:assigns])
end
