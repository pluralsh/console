defmodule Console.AI.Workbench.Subagents.Skill do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchSkill, WorkbenchJobActivity, PullRequest}
  alias Console.AI.Workbench.Environment
  alias Console.AI.Tools.Workbench.{
    Skills,
    Skill,
    SkillUpdate,
    SkillCreate,
    SkillIgnore,
    Scratchpad,
    Coding.PullRequests
  }
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  @skill_prompt {:user, "Given this, create or update whatever skill is necessary or abort based on the general parameters we've described for skill updates"}

  @spec run(WorkbenchJobActivity.t(), WorkbenchJob.t(), Environment.t()) :: map()
  def run(%WorkbenchJobActivity{} = activity, %WorkbenchJob{} = job, %Environment{} = environment) do
    target_job = target_job(%{job | activities: environment.activities})

    tools(target_job, environment)
    |> MemoryEngine.new(20,
      engine_opts(job) ++ [
        system_prompt: String.trim(system_prompt(job: target_job)),
        continue_msg: cont_msg(),
        acc: %{},
        callback: &callback(activity, &1)
      ]
    )
    |> MemoryEngine.reduce([{:user, String.trim(eval_job_prompt(job: target_job))}, @skill_prompt], &reducer/2)
    |> case do
      {:ok, attrs} -> attrs
      error -> error
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &terminal?/1) do
      %WorkbenchSkill{} = skill ->
        {:halt, %{status: :successful, result: %{output: String.trim(skill_result(skill: skill, update: false, pr: nil))}}}
      %SkillUpdate.Result{result: %PullRequest{url: _} = pr} ->
        {:halt, %{status: :successful, result: %{output: String.trim(skill_result(pr: pr, skill: nil, update: true))}}}
      %SkillUpdate.Result{result: %WorkbenchSkill{name: _} = skill} ->
        {:halt, %{status: :successful, result: %{output: String.trim(skill_result(skill: skill, update: true, pr: nil))}}}
      %SkillIgnore{} ->
        {:halt, %{status: :successful, result: %{output: "No skill update deemed necessary"}}}
      _ ->
        last_message(messages, &{:cont, %{status: :failed, result: %{error: &1}}})
    end
  end

  defp terminal?(%SkillUpdate.Result{}), do: true
  defp terminal?(%SkillIgnore{}), do: true
  defp terminal?(%WorkbenchSkill{}), do: true
  defp terminal?(_), do: false

  defp target_job(%WorkbenchJob{referenced_job: %WorkbenchJob{} = job}), do: job
  defp target_job(job), do: job

  defp tools(target_job, %Environment{skills: skills}) do
    [
      %Skills{skills: skills},
      %Skill{skills: skills},
      Scratchpad,
      %SkillUpdate{skills: skills, job: target_job},
      %SkillCreate{job: target_job},
      %PullRequests{job: target_job},
      SkillIgnore
    ]
  end

  EEx.function_from_file(:defp, :skill_result, Console.priv_filename(["prompts", "workbench", "skill_result.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :eval_job_prompt, Console.priv_filename(["prompts", "workbench", "eval_job.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :job_prompt, Console.priv_filename(["prompts", "vector", "workbench_job.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "skill_backfill.md.eex"]), [:assigns])
end
