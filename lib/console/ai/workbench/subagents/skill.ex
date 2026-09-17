defmodule Console.AI.Workbench.Subagents.Skill do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchEval, WorkbenchEvalResult, WorkbenchJob, WorkbenchSkill, WorkbenchJobActivity, PullRequest}
  alias Console.AI.Workbench.Environment
  alias Console.AI.Tools.Workbench.{
    SkillUpdate,
    SkillCreate,
    SkillIgnore,
    Scratchpad,
    Coding.PullRequests
  }
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]

  require EEx

  @spec run(WorkbenchJobActivity.t(), WorkbenchJob.t(), Environment.t()) :: map()
  def run(%WorkbenchJobActivity{} = activity, %WorkbenchJob{} = job, %Environment{} = environment) do
    target_job = target_job(%{job | activities: environment.activities})

    tools(target_job, environment)
    |> MemoryEngine.new(20,
      engine_opts(environment) ++ [
        system_prompt: String.trim(system_prompt(job: target_job)),
        continue_msg: cont_msg(),
        acc: %{},
        callback: &callback(activity, environment, &1)
      ]
    )
    |> MemoryEngine.reduce([{:user, String.trim(eval_job_prompt(job: target_job))}, skill_prompt(job)], &reducer/2)
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

  defp skill_prompt(job) do
    {:user, """
    Perform one final, bounded knowledge-capture assessment from the completed job record.

    Do not continue or re-investigate the original objective. Do not delegate any work.
    First inspect the current skills and treat their contents—not background model knowledge—as the
    source of truth for what is already documented. First prefer `SkillIgnore`. Create or update a
    skill only for durable, novel, actionable knowledge supported by the recorded result. After
    exactly one terminal tool call (`SkillIgnore`, `SkillUpdate`, or `SkillCreate`), stop.

    Follow these additional constraints from the parent skill job:
    #{WorkbenchJob.objective(job)}
    """}
  end

  defp tools(target_job, %Environment{skills: skills}) do
    skill_knowledge_tools(target_job, skills) ++ [
      Scratchpad,
      %SkillUpdate{skills: skills, job: target_job},
      %SkillCreate{
        job: target_job,
        max_skills: max_skills(target_job),
        skill_count: map_size(skills)
      },
      %PullRequests{job: target_job},
      SkillIgnore
    ]
  end

  defp max_skills(%WorkbenchJob{
         eval_result: %WorkbenchEvalResult{
           workbench_eval: %WorkbenchEval{automation: %{enabled: true, max_skills: max_skills}}
         }
       }) when is_integer(max_skills),
       do: max_skills

  defp max_skills(_), do: nil

  EEx.function_from_file(:defp, :skill_result, Console.priv_filename(["prompts", "workbench", "skill_result.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :eval_job_prompt, Console.priv_filename(["prompts", "workbench", "eval_job.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :job_prompt, Console.priv_filename(["prompts", "vector", "workbench_job.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "skill_backfill.md.eex"]), [:assigns])
end
