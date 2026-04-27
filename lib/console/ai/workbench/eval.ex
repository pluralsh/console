defmodule Console.AI.Workbench.Eval do
  @moduledoc """
  The module for evaluating the quality of a workbench job.
  """
  alias Console.Repo
  alias Console.AI.Provider
  alias Console.AI.Tools.Workbench.Eval
  alias Console.Schema.{WorkbenchEval, WorkbenchJob, Workbench}

  require EEx

  def evaluate(%WorkbenchJob{} = job) do
    case Repo.preload(job, [:activities, workbench: :eval]) do
      %WorkbenchJob{workbench: %Workbench{eval: %WorkbenchEval{} = eval}} = job ->
        do_eval(eval, job)
      _ -> {:error, "no eval found for workbench"}
    end
  end

  defp do_eval(%WorkbenchEval{} = eval, %WorkbenchJob{} = job) do
    Provider.simple_tool_call(
      [{:user, eval_job_prompt(job: job)}],
      %Eval{job: job, eval: eval},
      preface: system_prompt(eval: eval)
    )
  end

  EEx.function_from_file(:def, :activity_prompt, Console.priv_filename(["prompts", "workbench", "message.txt.eex"]), [:assigns])
  EEx.function_from_file(:defp, :eval_job_prompt, Console.priv_filename(["prompts", "workbench", "eval_job.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "eval.md.eex"]), [:assigns])
end
