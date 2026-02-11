defmodule Console.AI.Workbench.Subagents.Integration do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, WorkbenchTool}
  alias Console.AI.Tools.Workbench.{Result, Skills, Skill, Http}
  alias Console.AI.Workbench.Environment

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt}, %WorkbenchJob{prompt: jprompt}, %Environment{} = environment) do
    tools(environment)
    |> MemoryEngine.new(20, system_prompt: system_prompt(prompt: jprompt), acc: %{})
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      {:error, error} -> %{status: :failed, error: "error running infrastructure subagent: #{inspect(error)}"}
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Result{}, &1)) do
      %Result{output: output} -> {:halt, %{
        status: :successful,
        result: %{output: output}
      }}
      _ -> last_message(messages, & {:cont, %{status: :failed, error: &1}})
    end
  end

  defp tools(%Environment{skills: skills, tools: tools}) do
    workbench_tools(tools)
    |> Enum.concat([
      %Skills{skills: skills},
      %Skill{skills: skills},
      Result
    ])
  end

  @allowed_tools ~w(http)a

  defp workbench_tools(tools) do
    Enum.map(tools, &elem(&1, 1))
    |> Enum.filter(fn
      %WorkbenchTool{tool: t} when t in @allowed_tools -> true
      _ -> false
    end)
    |> Enum.map(fn
      %WorkbenchTool{tool: :http} = tool -> %Http{tool: tool}
      _ -> nil
    end)
    |> Enum.filter(& &1)
  end

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "integration.md.eex"]), [:assigns])
end
