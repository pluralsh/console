defmodule Console.AI.Workbench.Engine do
  @moduledoc """
  The overarching orchestrator to manage workbench execution.  The general architecture is as follows:

  The engine first calls a plan subagent to compile a general plan of attack. From there it falls into an execution loop which:

  1. Runs a small agentic process to fetch skill information or take notes, but ultimately delegates to a variety of subagents
  2. Each subagent does work independently and comes back with a result, these are marked as activities that can be presented in UI but also as
     message history to the memory engine to inform the next iteration of the loop.
  3. A complete tool is used to mark the conclusion of the job.
  """
  import Console.AI.Workbench.Subagents.Base, only: [drop_empty: 1, log_error: 2]
  import Console.AI.Agents.Base, only: [publish_absinthe: 2]
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]
  alias Console.Repo
  alias Console.AI.Chat.MemoryEngine
  alias Console.Deployments.Workbenches
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, WorkbenchTool, ChatConnection, ChatbotMessage}
  alias Console.AI.Workbench.Skills, as: SkillsUtil
  alias Console.AI.Workbench.Subagents, as: SA
  alias Console.AI.Workbench.{
    Environment,
    Message,
    Supervisor,
    Heartbeat,
    Canvas
  }
  alias Console.AI.Tools.Workbench.{
    Lua,
    Complete,
    Subagents,
    Subagent,
    Skills,
    Skill,
    Notes,
    FetchNotes,
    SkillBackfill
  }
  alias Console.AI.Tools.Workbench.Canvas, as: CanvasTool

  require EEx
  require Logger

  defstruct [:job, :user, :environment, activities: [], messages: [], iterations: 0, max: 200]

  defmodule Acc do
    defstruct [messages: [], activities: []]
  end

  def new(%WorkbenchJob{} = job) do
    %{user: user, workbench: workbench} = job = preload_job(job)

    user = Console.Services.Rbac.preload(user)
    with {:ok, _} <- Heartbeat.start_link(job),
         {:ok, skills} <- SkillsUtil.skills(workbench),
         env = Environment.new(job, backfill_chat(workbench.tools, job), skills),
         {:ok, _} <- Supervisor.start_link(env) do
      Console.AI.Tool.context(user: user, runtime: workbench.agent_runtime)
      {:ok, %__MODULE__{job: job, user: user, environment: env}}
    else
      {:error, _} = err ->
        Workbenches.fail_job("Error loading workbench environment: #{inspect(err)}", job)
        err
    end
  end

  def run(%__MODULE__{job: job} = engine) do
    # stream_callbacks(job)
    # with {:ok, job} <- SA.Plan.run(job, engine.environment) do
    #   loop(%{engine | activities: list_activities(job)})
    # end
    Console.AI.Provider.external_errors()
    loop(%{engine | activities: list_activities(job)})
  end

  defp loop(%__MODULE__{iterations: iter, max: max, job: job})
    when iter >= max, do: Workbenches.fail_job("Max iterations reached", job)
  defp loop(%__MODULE__{job: job, environment: environment, activities: activities, messages: msgs} = engine) do
    messages = case msgs do
      [_ | _] = msgs -> Enum.map(msgs, &Message.to_message/1)
      _ -> Enum.map(activities, &Message.to_message/1)
    end

    tools(job, environment, activities)
    |> MemoryEngine.new(50, engine_opts(job) ++ [system_prompt: &sysprompt(job, &1), acc: %Acc{messages: msgs}, tool_fmt: &tool_fmt/1, callback: &callback(job, &1)])
    |> MemoryEngine.reduce(Enum.reverse([{:user, String.trim(continue_prompt(engine: engine))} | messages]), &reducer/2)
    |> case do
      {:ok, %Complete{
        conclusion: conclusion,
        metrics_query: metrics_query,
        traces_query: traces_query,
        logs: logs,
        traces: traces,
        todos: todos,
        topology: topology,
        criticism: criticism
      }} ->
        drop_empty(%{
          conclusion: conclusion,
          todos: todos,
          topology: topology,
          criticism: criticism,
          metadata: drop_empty(%{
            metrics_query: metrics_query,
            traces_query: traces_query,
            logs: logs,
            traces: traces
          }),
        })
        |> Workbenches.complete_job(job)
      {:ok, {msgs, l}} when is_list(l) -> spawn_activities(l, msgs, engine)
      {:error, error} -> Workbenches.fail_job("Error running workbench: #{inspect(error)}", job)
    end
  end

  defp tool_fmt(%Notes{} = notes), do: String.trim(notes_message(notes: notes))
  defp tool_fmt(%Subagent{subagent: name}), do: "launched #{name} subagent, waiting for the result"
  defp tool_fmt(%CanvasTool{}), do: "launched canvas subagent, waiting for the result"
  defp tool_fmt(%Complete{}), do: "concluded work on this pass, workbench job is completed"
  defp tool_fmt(pass), do: pass

  defp reducer(messages, %Acc{messages: msgs}) do
    Enum.reduce_while(messages, {[], []}, fn
      %Complete{} = complete, _ -> {:halt, complete}
      %Subagent{} = subagent, {msgs, acts} -> {:cont, {msgs, [subagent | acts]}}
      %CanvasTool{} = canvas, {msgs, acts} -> {:cont, {msgs, [canvas | acts]}}
      %Notes{} = notes, {msgs, acts} -> {:cont, {msgs, [notes | acts]}}
      %SkillBackfill{} = backfill, {msgs, acts} -> {:cont, {msgs, [backfill | acts]}}
      msg, {msgs, acts} -> {:cont, {[msg | msgs], acts}}
    end)
    |> case do
      %Complete{} = complete -> {:halt, complete}
      {new, [_ | _] = acts} -> {:halt, {new ++ msgs, acts}}
      {new, []} -> {:cont, %Acc{messages: new ++ msgs}}
    end
  end

  defp spawn_activities(actions, msgs, engine) do
    Task.async_stream(actions, &spawn_activity(&1, engine), max_concurrency: 10, timeout: :timer.minutes(30))
    |> Enum.flat_map(fn
      {:ok, {:ok, %WorkbenchJobActivity{} = activity}} -> [activity]
      {:ok, {:error, error}} ->
        Logger.error("Error spawning activity: #{inspect(error)}")
        []
      _ -> []
    end)
    |> then(& %{engine | activities: &1 ++ engine.activities, messages: &1 ++ msgs, iterations: engine.iterations + 1, job: refresh_job(engine.job)})
    |> loop()
  end

  @supported_subagents ~w(infrastructure integration coding observability memory skill history search)a

  defp spawn_activity(%Subagent{subagent: type, prompt: prompt} = call, %__MODULE__{job: job, environment: environment, activities: activities})
      when type in @supported_subagents do
    module = subagent_module(type)
    Console.AI.Provider.external_errors()
    Console.AI.Tool.context(runtime: job.workbench.agent_runtime, user: job.user, job: job)
    with {:ok, activity} <- Workbenches.create_job_activity(%{type: type, prompt: prompt, tool_call: tool_attrs(call)}, job) do
      # stream_callbacks(activity)
      Console.safely(fn ->
        module.run(activity, job, %{environment | activities: activities})
      end, &crash_fallback/1)
      |> Workbenches.update_job_activity(activity)
      |> log_error("Failed to update job activity")
    end
  end

  defp spawn_activity(%SkillBackfill{prompt: prompt} = call, %__MODULE__{job: job, environment: environment, activities: activities}) do
    Console.AI.Tool.context(runtime: job.workbench.agent_runtime, user: job.user, job: job)
    Console.AI.Provider.external_errors()

    with {:ok, activity} <- Workbenches.create_job_activity(%{type: :skill, prompt: prompt, tool_call: tool_attrs(call)}, job) do
      # stream_callbacks(activity)
      Console.safely(fn ->
        SA.Skill.run(activity, job, %{environment | activities: activities})
      end, &crash_fallback/1)
      |> Workbenches.update_job_activity(activity)
      |> log_error("Failed to update job activity")
    end
  end

  defp spawn_activity(%CanvasTool{prompt: prompt} = call, %__MODULE__{job: job, activities: activities, environment: environment}) do
    Console.AI.Tool.context(runtime: job.workbench.agent_runtime, user: job.user)
    Console.AI.Provider.external_errors()
    with {:ok, activity} <- Workbenches.create_job_activity(%{type: :canvas, prompt: prompt, tool_call: tool_attrs(call)}, job) do
      Canvas.new(activity, existing_canvas(job))

      output = Console.safely(fn ->
        SA.Canvas.run(activity, job, %{environment | activities: activities})
      end, & "error running subagent: #{inspect(&1)}, feel free to try again if it is still necessary")

      Canvas.canvas()
      |> Canvas.render()
      |> Workbenches.save_canvas(output, activity)
      |> log_error("failed to save canvas")
      |> case do
        {:ok, activity, _} -> {:ok, activity}
        err -> err
      end
    end
  end

  defp spawn_activity(%Notes{status: status, summary: summary} = call, %__MODULE__{job: job}) do
    Console.mapify(status)
    |> Map.drop([:id])
    |> then(& %{
      status: drop_empty(&1),
      prompt: summary,
      output: summary,
      tool_call: tool_attrs(call)
    })
    |> Workbenches.update_job_status(job)
  end

  defp spawn_activity(_, _), do: :ignore

  defp existing_canvas(%WorkbenchJob{result: %Console.Schema.WorkbenchJobResult{canvas: canvas}}) when is_list(canvas), do: canvas
  defp existing_canvas(_), do: []

  defp crash_fallback(err) do
    %{status: :failed, result: %{error: "error running subagent: #{inspect(err)}, feel free to try again if it is still necessary"}}
  end

  defp subagent_module(:infrastructure), do: SA.Infrastructure
  defp subagent_module(:integration), do: SA.Integration
  defp subagent_module(:coding), do: SA.Coding
  defp subagent_module(:observability), do: SA.Observability
  defp subagent_module(:memory), do: SA.Memory
  defp subagent_module(:history), do: SA.History
  defp subagent_module(:skill), do: SA.Skill
  defp subagent_module(:search), do: SA.Search

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
    |> preload_job()
  end

  defp tools(%WorkbenchJob{} = job, %Environment{skills: skills}, activities) do
    subagents = Environment.subagents(job) |> maybe_add_memory(activities)
    categories = Environment.categories(job)
    skills = Environment.with_builtins(skills) |> Environment.subagent_skills(:orchestrator)

    [
      %Skills{skills: skills},
      %Skill{skills: skills},
      %Subagents{bench: job.workbench, subagents: subagents, categories: categories},
      %Subagent{subagents: subagents},
      %FetchNotes{job: job},
      Lua,
      Notes,
      Complete,
    ] ++ type_tools(job)
      ++ include_backfill(job)
  end

  defp include_backfill(%WorkbenchJob{result: %{conclusion: c}}) when is_binary(c) and byte_size(c) > 0, do: [SkillBackfill]
  defp include_backfill(_), do: []

  defp type_tools(%WorkbenchJob{type: :skill}), do: []
  defp type_tools(_), do: [CanvasTool]

  defp sysprompt(%WorkbenchJob{type: :skill, prompt: prompt, referenced_job: job}, _), do: String.trim(skill_system_prompt(job: job, prompt: prompt))
  defp sysprompt(%WorkbenchJob{prompt: prompt} = job, engine), do: String.trim(system_prompt(job: job, prompt: prompt, engine: engine))

  defp backfill_chat(tools, %WorkbenchJob{chatbot_message: %ChatbotMessage{chat_connection: %{type: t} = conn}}) do
    Enum.any?(tools, fn
      %WorkbenchTool{tool: ^t} -> true
      _ -> false
    end)
    |> case do
      true -> tools
      false -> [ChatConnection.to_tool(conn) | tools]
    end
  end
  defp backfill_chat(tools, _), do: tools

  @preloads [:result, :flow, chatbot_message: [:chat_connection], user: [:groups], workbench: [:workbench_skills, :repository, :agent_runtime, [tools: [:mcp_server, :cloud_connection, :scm_connection]]]]

  defp preload_job(%WorkbenchJob{type: :skill} = job),
    do: Repo.preload(job, @preloads ++ [referenced_job: [:result, workbench: [:workbench_skills, :repository], activities: :thoughts]])
  defp preload_job(job), do: Repo.preload(job, @preloads)

  defp maybe_add_memory(subagents, activities) when length(activities) > 5, do: [:memory | subagents]
  defp maybe_add_memory(subagents, _), do: subagents

  def callback(%WorkbenchJob{id: id}, {:tool, content, %{name: name, arguments: args}}) when is_binary(content) do
    publish_absinthe(%{
      tool: name,
      arguments: args,
      text: content
    }, workbench_job_progress: "workbench_jobs:#{id}:progress")
  end
  def callback(_, _), do: :ok

  EEx.function_from_file(:defp, :skill_system_prompt, Console.priv_filename(["prompts", "workbench", "eval_skill.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :continue_prompt, Console.priv_filename(["prompts", "workbench", "continue.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :notes_message, Console.priv_filename(["prompts", "workbench", "notes_message.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "job.md.eex"]), [:assigns])
end
