defmodule Console.AI.Workbench.Subagents.Search do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity}
  alias Console.AI.Tools.Workbench.{Result, Skills, Skill, Scratchpad}
  alias Console.AI.Workbench.{Environment, MCP}
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt} = job, %Environment{} = environment) do
    tools(environment)
    |> MemoryEngine.new(20,
      engine_opts(job) ++ [
        system_prompt: String.trim(system_prompt(prompt: jprompt)),
        acc: %{},
        callback: &callback(activity, &1),
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
    MCP.expand_tools(Environment.subagent_tools(tools, :search), job)
    |> Enum.concat([
      %Skills{skills: Environment.subagent_skills(skills, :search)},
      %Skill{skills: Environment.subagent_skills(skills, :search)},
      Scratchpad,
      Result
    ])
  end

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "search.md.eex"]), [:assigns])
end
