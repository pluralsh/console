defmodule Console.AI.Workbench.Subagents.Skill do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchSkill, WorkbenchJobActivity}
  alias Console.AI.Workbench.Environment
  alias Console.AI.Tools.Workbench.{
    Skills,
    Skill,
    SkillUpdate,
    SkillCreate,
    SkillIgnore,
    Coding.PullRequests
  }

  require EEx

  @skill_prompt {:user, "Given this, update whatever skill is necessary or abort based on the general parameters we've described for skill updates"}

  @spec run(WorkbenchJobActivity.t(), WorkbenchJob.t(), Environment.t()) :: binary
  def run(%WorkbenchJobActivity{prompt: prompt} = activity, %WorkbenchJob{} = job, %Environment{} = environment) do
    tools(job, environment)
    |> MemoryEngine.new(20, system_prompt: String.trim(system_prompt(job: job)), acc: %{}, callback: &callback(activity, &1))
    |> MemoryEngine.reduce([
      {:user, String.trim(eval_job_prompt(eval: job.referenced_job.eval_result, prompt: prompt))},
      {:user, "Here is a description of the job that was just completed:\n\n#{String.trim(job_prompt(job: job))}"},
      @skill_prompt
    ], &reducer/2)
    |> case do
      {:ok, attrs} -> %{status: :successful, result: attrs}
      error -> error
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &terminal?/1) do
      %WorkbenchSkill{} = skill -> {:ok, "Created new workbench skill #{skill.name}"}
      %SkillUpdate.Result{result: %{url: url}} -> {:ok, "Updated workbench skill via PR #{url}"}
      %SkillUpdate.Result{result: %{name: name}} -> {:ok, "Updated workbench skill #{name}"}
      %SkillIgnore{} -> {:ok, "No skill update deemed necessary"}
      _ -> last_message(messages, & {:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp terminal?(%SkillUpdate.Result{}), do: true
  defp terminal?(%SkillIgnore{}), do: true
  defp terminal?(%WorkbenchSkill{}), do: true

  defp tools(job, %Environment{skills: skills}) do
    [
      %Skills{skills: skills},
      %Skill{skills: skills},
      %SkillUpdate{skills: skills, job: job},
      %SkillCreate{job: job},
      %PullRequests{job: job.referenced_job},
      SkillIgnore
    ]
  end

  EEx.function_from_file(:defp, :eval_job_prompt, Console.priv_filename(["prompts", "workbench", "eval_job.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :job_prompt, Console.priv_filename(["prompts", "vector", "workbench_job.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "skill_backfill.md.eex"]), [:assigns])
end
