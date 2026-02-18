defmodule Console.AI.Workbench.Engine do
  @moduledoc """
  The overarching orchstrator to manage workbench execution.  The general architecture is as follows:

  The engine first calls a plan subagent to compile a general plan of attack. From there it falls into an execution loop which:

  1. Runs a small agentic process to fetch skill information or take notes, but ultimately delegates to a variety of subagents
  2. Each subagent does work independently and comes back with a result, these are marked as activities that can be presented in UI but also as
     message history to the memory engine to inform the next iteration of the loop.
  3. A complete tool is used to mark the conclusion of the job.
  """
  alias Console.Repo
  alias Console.AI.Chat.MemoryEngine
  alias Console.Deployments.Workbenches
  alias Console.Schema.{
    WorkbenchJob,
    WorkbenchJobActivity
  }
  alias Console.AI.Workbench.Skills, as: SkillsUtil
  alias Console.AI.Workbench.Subagents, as: SA
  alias Console.AI.Workbench.{
    Environment,
    Message,
  }
  alias Console.AI.Tools.Workbench.{
    Complete,
    Subagents,
    Subagent,
    Skills,
    Skill,
    Notes,
    FetchNotes
  }

  require EEx

  defstruct [:job, :user, :environment, activities: [], iterations: 0, max: 200]

  def new(%WorkbenchJob{} = job) do
    %{user: user, workbench: workbench} = job = Repo.preload(job, [:user, workbench: [:tools, :repository, :agent_runtime]])

    user = Console.Services.Rbac.preload(user)
    with {:ok, skills} <- SkillsUtil.skills(workbench) do
      env = Environment.new(job, workbench.tools, skills)
      Console.AI.Tool.context(user: user, runtime: workbench.agent_runtime)
      {:ok, %__MODULE__{job: job, user: user, environment: env}}
    else
      {:error, _} = err ->
        Workbenches.fail_job("Error loading workbench environment: #{inspect(err)}", job)
        err
    end
  end

  def run(%__MODULE__{job: job} = engine) do
    with {:ok, job} <- SA.Plan.run(job, engine.environment) do
      loop(%{engine | activities: list_activities(job)})
    end
  end

  defp loop(%__MODULE__{iterations: iter, max: max, job: job})
    when iter >= max, do: Workbenches.fail_job("Max iterations reached", job)
  defp loop(%__MODULE__{job: job, environment: environment, activities: activities} = engine) do
    messages = Enum.map(activities, &Message.to_message/1)

    tools(job, environment)
    |> MemoryEngine.new(20, system_prompt: system_prompt(prompt: job.prompt), acc: %{})
    |> MemoryEngine.reduce(Enum.reverse([{:user, continue_prompt(engine)} | messages]), &reducer/2)
    |> case do
      {:ok, %Complete{conclusion: conclusion}} -> Workbenches.complete_job(conclusion, job)
      {:ok, l} when is_list(l) -> spawn_activities(l, engine)
      {:error, error} -> Workbenches.fail_job("Error running workbench: #{inspect(error)}", job)
    end
  end

  defp reducer(messages, _) do
    Enum.reduce_while(messages, [], fn
      %Complete{} = complete, _ -> {:halt, complete}
      %Subagent{} = subagent, acc -> {:cont, [subagent | acc]}
      %Notes{} = notes, acc -> {:cont, [notes | acc]}
      _, acc -> {:cont, acc}
    end)
    |> case do
      %Complete{} = complete -> {:halt, complete}
      l when is_list(l) -> {:halt, l}
      _ -> {:cont, []}
    end
  end

  defp spawn_activities(actions, engine) do
    Task.async_stream(actions, &spawn_activity(&1, engine), max_concurrency: 10, timeout: :timer.minutes(30))
    |> Enum.reduce(engine, fn
      {:ok, {:ok, %WorkbenchJobActivity{} = activity}}, engine ->
        %{engine | activities: [activity | engine.activities]}
      _, engine -> engine
    end)
    |> then(& %{&1 | iterations: &1.iterations + 1, job: refresh_job(&1.job)})
    |> loop()
  end

  @supported_subagents ~w(infrastructure integration coding)a

  defp spawn_activity(%Subagent{subagent: type, prompt: prompt} = call, %__MODULE__{job: job, environment: environment})
      when type in @supported_subagents do
    module = subagent_module(type)
    Console.AI.Tool.context(runtime: job.workbench.agent_runtime, user: job.user)
    with {:ok, activity} <- Workbenches.create_job_activity(%{type: type, prompt: prompt, tool_call: tool_attrs(call)}, job) do
      module.run(activity, job, environment)
      |> Workbenches.update_job_activity(activity)
    end
  end

  defp spawn_activity(%Notes{status: status, prompt: prompt, output: output} = call, %__MODULE__{job: job}) do
    Workbenches.update_job_status(%{
      status: Console.mapify(status),
      prompt: prompt,
      output: output,
      tool_call: tool_attrs(call)
    }, job)
  end

  defp spawn_activity(_, _), do: :ignore

  defp subagent_module(:infrastructure), do: SA.Infrastructure
  defp subagent_module(:integration), do: SA.Integration
  defp subagent_module(:coding), do: SA.Coding

  defp tool_attrs(%{id: %Console.AI.Tool{id: id, name: name, arguments: arguments}}) when is_binary(id) and is_binary(name),
    do: %{call_id: id, name: name, arguments: arguments}
  defp tool_attrs(_), do: nil

  defp list_activities(%WorkbenchJob{id: id}) do
    WorkbenchJobActivity.ordered()
    |> WorkbenchJobActivity.for_workbench_job(id)
    |> Repo.all()
    |> Enum.reverse()
  end

  defp refresh_job(%WorkbenchJob{id: id}) do
    Console.Repo.get!(WorkbenchJob, id)
    |> Repo.preload([:user, workbench: [:tools, :repository, :agent_runtime]])
  end

  defp tools(%WorkbenchJob{} = job, %Environment{skills: skills}) do
    subagents = Environment.subagents(job)
    [
      %Skills{skills: skills},
      %Skill{skills: skills},
      %Subagents{subagents: subagents},
      %Subagent{subagents: subagents},
      %FetchNotes{job: job},
      Notes,
      Complete,
    ]
  end

  defp continue_prompt(%__MODULE__{activities: [_, _ | _]}), do: "Ok, let's keep working" # the first activity is the plan
  defp continue_prompt(_), do: "Ok, let's start working"

  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "job.md.eex"]), [:assigns])
end
