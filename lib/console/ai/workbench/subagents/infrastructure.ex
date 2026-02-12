defmodule Console.AI.Workbench.Subagents.Infrastructure do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, Workbench}
  alias Console.AI.Tools.Workbench.{SummarizeComponent, Result, Skills, Skill}
  alias Console.AI.Tools.Agent.{ServiceComponent, Stack}
  alias Console.AI.Workbench.Environment

  require EEx

  def run(%WorkbenchJobActivity{prompt: prompt}, %WorkbenchJob{prompt: jprompt} = job, %Environment{} = environment) do
    tools(job, environment)
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

  defp tools(%WorkbenchJob{workbench: bench}, %Environment{skills: skills}) do
    svc_tools(bench)
    |> Enum.concat(stack_tools(bench))
    |> Enum.concat(k8s_tools(bench))
    |> Enum.concat([
      %Skills{skills: skills},
      %Skill{skills: skills},
      Result
    ])
  end

  defp svc_tools(%Workbench{configuration: %{infrastructure: %{services: true}}}), do:  [ServiceComponent]
  defp svc_tools(_), do: []

  defp stack_tools(%Workbench{configuration: %{infrastructure: %{stacks: true}}}), do: [Stack]
  defp stack_tools(_), do: []

  defp k8s_tools(%Workbench{configuration: %{infrastructure: %{kubernetes: true}}}), do: [SummarizeComponent]
  defp k8s_tools(_), do: []

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "infrastructure.md.eex"]), [:assigns])
end
