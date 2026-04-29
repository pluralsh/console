defmodule Console.AI.Workbench.Knowledge.Backfill do
  use Console.AI.Workbench.Subagents.Base
  alias Console.Schema.{WorkbenchJob, WorkbenchSkill, WorkbenchEvalResult}
  alias Console.Deployments.Workbenches
  alias Console.Repo
  alias Console.AI.Workbench.Skills, as: SkillsUtils
  alias Console.AI.Tools.Workbench.{Skills, Skill, SkillUpdate, SkillIgnore, SkillCreate}

  require EEx

  @preloads [:activities, :result, :pull_requests, workbench: [:repository, :workbench_skills]]
  @skill_prompt {:user, "Given this, update whatever skill is necessary or abort based on the general parameters we've described for skill updates"}

  def skill_from_eval(%WorkbenchEvalResult{} = result, prompt) do
    eval = Repo.preload(result, [workbench_job: @preloads])

    case do_skill_backfill(eval.workbench_job, [{:user, String.trim(eval_job_prompt(eval: eval, prompt: prompt))}, @skill_prompt]) do
      {:ok, %SkillIgnore{}} -> {:ok, "No skill update deemed necessary"}
      {:ok, %WorkbenchSkill{} = skill} -> {:ok, "Created new workbench skill #{skill.name}"}
      {:ok, %SkillUpdate.Result{result: %{url: url}}} -> {:ok, "Updated workbench skill via PR #{url}"}
      {:ok, %SkillUpdate.Result{result: %{name: name}}} -> {:ok, "Updated workbench skill #{name}"}
      error -> error
    end
  end

  def skills(%WorkbenchJob{} = job) do
    job = Repo.preload(job, @preloads)
    do_skill_backfill(job, [@skill_prompt])
  end

  defp do_skill_backfill(%WorkbenchJob{} = job, [_ | _] = prompt) do
    with {:ok, job} <- Workbenches.knowledge_updated(job),
         {:ok, skills} <- SkillsUtils.skills(job.workbench) do
      base = {:user, "Here is a description of the job that was just completed:\n\n#{String.trim(job_prompt(job: job))}"}

      tools(job, Map.new(skills, & {&1.name, &1}))
      |> MemoryEngine.new(20, system_prompt: String.trim(system_prompt(job: job)), acc: %{})
      |> MemoryEngine.reduce([base | prompt], &reducer/2)
      |> case do
        {:ok, attrs} -> attrs
        error -> error
      end
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &terminal?/1) do
      %SkillUpdate.Result{} = result -> {:halt, result}
      %SkillIgnore{} = ignore -> {:halt, ignore}
      %WorkbenchSkill{} = create -> {:halt, create}
      _ -> last_message(messages, & {:cont, {:error, &1}})
    end
  end

  defp terminal?(%SkillUpdate.Result{}), do: true
  defp terminal?(%SkillIgnore{}), do: true

  defp tools(job, skills) do
    [
      %Skills{skills: skills},
      %Skill{skills: skills},
      %SkillUpdate{skills: skills, job: job},
      %SkillCreate{job: job},
      SkillIgnore
    ]
  end

  EEx.function_from_file(:defp, :eval_job_prompt, Console.priv_filename(["prompts", "workbench", "eval_job.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :job_prompt, Console.priv_filename(["prompts", "vector", "workbench_job.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "skill_backfill.md.eex"]), [:assigns])
end
