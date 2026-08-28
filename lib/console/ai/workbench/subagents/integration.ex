defmodule Console.AI.Workbench.Subagents.Integration do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity}
  alias Console.AI.Tools.Workbench.{Result, Scratchpad}
  alias Console.AI.Workbench.{Environment, MCP, Tools}
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{} = job, %Environment{} = environment) do
    tools = tools(environment)

    MemoryEngine.new(tools, 20,
      engine_opts(environment) ++ [
        system_prompt: &String.trim(system_prompt(prompt: WorkbenchJob.objective(job), engine: &1)),
        acc: %{},
        tool_search: length(tools) > 10,
        pre_enable: [Result | skill_knowledge_pre_enable()],
        callback: &callback(activity, environment, &1),
        continue_msg: cont_msg()
      ]
    )
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, result: %{error: "error running infrastructure subagent: #{inspect(error)}"}}
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

  defp tools(%Environment{skills: skills, tools: tools, job: job}) do
    skills = Environment.subagent_skills(skills, :integration)

    Tools.integration_tools(tools)
    |> Enum.concat(MCP.expand_tools(Environment.subagent_tools(tools, :integration), job))
    |> Enum.concat(skill_knowledge_tools(job, skills) ++ [
      Scratchpad,
      Result
    ])
  end

  def scm_tools(tools), do: Tools.scm_tools(tools)

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "integration.md.eex"]), [:assigns])
end
