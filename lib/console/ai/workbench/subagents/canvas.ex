defmodule Console.AI.Workbench.Subagents.Canvas do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity}
  alias Console.AI.Tools.Workbench.{
    Result,
    Skills,
    Skill,
  }
  alias Console.AI.Tools.Workbench.Canvas.{
    Canvas,
    MarkdownBlock,
    MetricsBlock,
    LogsBlock,
    PieBlock,
    BarBlock,
    Empty
  }
  alias Console.AI.Workbench.Environment

  require EEx

  @spec run(WorkbenchJobActivity.t(), WorkbenchJob.t(), Environment.t()) :: binary
  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{prompt: jprompt}, %Environment{} = environment) do
    tools(environment)
    |> MemoryEngine.new(20, system_prompt: String.trim(system_prompt(prompt: jprompt)), acc: %{}, callback: &callback(activity, &1))
    |> MemoryEngine.reduce([{:user, prompt}], &reducer/2)
    |> case do
      {:ok, output} -> output
      {:error, error} -> "error running canvas subagent: #{inspect(error)}"
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Result{}, &1)) do
      %Result{output: output} -> {:halt, output}
      _ -> last_message(messages, & {:cont, "Failed to complete canvas subagent: #{&1}"})
    end
  end

  defp tools(%Environment{skills: skills} = env) do
    [
      %Skills{skills: Environment.subagent_skills(skills, :canvas)},
      %Skill{skills: Environment.subagent_skills(skills, :canvas)},
      Result,
      Canvas,
      MarkdownBlock,
      %MetricsBlock{env: env},
      %LogsBlock{env: env},
      PieBlock,
      BarBlock,
      Empty
    ]
  end

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "canvas.md.eex"]), [:assigns])
end
