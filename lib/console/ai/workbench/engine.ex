defmodule Console.AI.Workbench.Engine do
  @moduledoc """
  The overarching orchestrator to manage workbench execution. It runs an execution loop which:

  1. Runs a small agentic process to fetch skill information or take notes, but ultimately delegates to a variety of subagents
  2. Each subagent does work independently and comes back with a result, these are marked as activities that can be presented in UI but also as
     message history to the memory engine to inform the next iteration of the loop.
  3. A complete tool is used to mark the conclusion of the job.
  """
  import Console.AI.Workbench.Subagents.Base, only: [drop_empty: 1, log_error: 2, skill_knowledge_tools: 2]
  import Console.AI.Agents.Base, only: [publish_absinthe: 2]
  import Console.AI.Workbench.Environment, only: [engine_opts: 1]
  import Console.Schema.WorkbenchJobActivity, only: [is_action: 1]
  alias Console.Repo
  alias Console.AI.Chat.MemoryEngine
  alias Console.AI.Provider.Base, as: ProviderBase
  alias Console.Deployments.Workbenches
  alias Console.Schema.{WorkbenchJob, WorkbenchJobActivity, WorkbenchTool, ChatConnection, ChatbotMessage, User}
  alias Console.AI.Workbench.Skills, as: SkillsUtil
  alias Console.AI.Workbench.Subagents, as: SA
  alias Console.AI.Workbench.{
    Environment,
    Message,
    Supervisor,
    Heartbeat,
    Canvas,
    Activity,
    Tools,
    Tracking
  }
  alias Console.AI.Tools.Workbench.{
    Codemode,
    Complete,
    Subagents,
    Subagent,
    KnowledgeUpsert,
    KnowledgeDelete,
    Notes,
    FetchNotes,
    SkillBackfill,
    FunctionCall,
    KubeDrain,
    KubeRequest,
    KubeShell,
    Infrastructure.KubeExec,
    Infrastructure.KubeUpdate,
    Infrastructure.KubeDelete
  }
  alias Console.AI.Tools.Workbench.Infrastructure.KubeDrain, as: KubeDrainTool
  alias Console.AI.Tool.Approval, as: Approval
  alias Console.AI.Tools.Workbench.Canvas, as: CanvasTool
  alias ReqLLM.Context

  require EEx
  require Logger

  defstruct [:job, :user, :environment, :context, iterations: 0, max: 200, verifiable: false]

  def new(%WorkbenchJob{} = job) do
    %{user: user, workbench: workbench} = job = preload_job(job)

    user = Console.Services.Rbac.preload(user)
    tools = backfill_chat(workbench.tools, job)

    # MCP clients must be up before Environment.new/3 indexes tools via tools/list.
    with {:ok, _} <- Heartbeat.start_link(job),
         {:ok, _} <- Supervisor.start_link(tools, job),
         {:ok, skills} <- load_skills(workbench) do
      env = Environment.new(job, tools, skills)
      Console.AI.Tool.context(user: user, runtime: workbench.agent_runtime)
      {:ok, %__MODULE__{job: job, user: user, environment: env}}
    else
      {:error, {:already_started, _}} = err -> err
      {:error, {:shutdown, {:failed_to_start_child, _, {:already_started, _}}}} = err -> err
      {:error, _} = err ->
        Workbenches.fail_job("Error loading workbench environment: #{inspect(err)}", job)
        err
    end
  end

  defp load_skills(workbench) do
    Console.Retrier.retry(
      fn -> SkillsUtil.skills(workbench) end,
      max: 6,
      pause: :timer.seconds(1),
      backoff: 2,
      max_pause: :timer.seconds(10),
      retry_if: &match?({:error, reason} when reason in [:agent_bootstrapping, :rate_limited], &1)
    )
  end

  def run(%__MODULE__{job: job} = engine) do
    Tracking.with_run(job, fn ->
      Console.AI.Provider.external_errors()

      list_activities(job)
      |> then(&put_in(engine.environment.activities, &1))
      |> verifiable()
      |> loop()
    end)
  end

  defp loop(%__MODULE__{iterations: iter, max: max, job: job})
    when iter >= max, do: Workbenches.fail_job("Max iterations reached", job)
  defp loop(
         %__MODULE__{
           job: job,
           environment: %Environment{activities: activities} = environment
         } = engine
       ) do
    context = workbench_context(engine)

    tools(job, environment, activities)
    |> MemoryEngine.new(50,
      engine_opts(environment) ++
        [
          system_prompt: &sysprompt(job, environment, &1),
          acc: [],
          callback: &callback(job, &1)
        ]
    )
    |> MemoryEngine.reduce_with_context(context, &reducer/2)
    |> case do
      {:ok,
       {%Complete{
          conclusion: conclusion,
          metrics_query: metrics_query,
          traces_query: traces_query,
          logs: logs,
          traces: traces,
          todos: todos,
          topology: topology,
          criticism: criticism
        }, _context}} ->
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
      {:ok, {[_ | _] = actions, %Context{} = context}} ->
        spawn_activities(actions, context, engine)
      {:ok, {_, %Context{}}} ->
        Workbenches.fail_job("Workbench job was not properly completed", job)
      {:error, error} -> Workbenches.fail_job("Error running workbench: #{inspect(error)}", job)
    end
  end

  defp reducer(messages, _) do
    case Enum.find(messages, &match?(%Complete{}, &1)) do
      %Complete{} = complete ->
        {:halt, complete}

      _ ->
        case Enum.filter(messages, &activity?/1) do
          [_ | _] = actions -> {:halt, actions}
          [] -> {:cont, []}
        end
    end
  end

  defp activity?(%Subagent{}), do: true
  defp activity?(%FunctionCall{}), do: true
  defp activity?(%CanvasTool{}), do: true
  defp activity?(%Notes{}), do: true
  defp activity?(%SkillBackfill{}), do: true
  defp activity?(%KubeRequest{}), do: true
  defp activity?(%KubeDrain{}), do: true
  defp activity?(%KubeShell{}), do: true
  defp activity?(_), do: false

  defp spawn_activities(all_actions, %Context{} = context, engine) do
    {memos, actions} = Enum.split_with(all_actions, &match?(%Notes{}, &1))
    {memo_activities, memo_results} = run_activities(memos, engine, max_concurrency: 1)

    engine = case memo_activities do
      [_ | _] = activities ->
        engine = put_in(engine.environment.activities, activities ++ engine.environment.activities)
        %{engine | job: refresh_job(engine.job)}

      [] ->
        engine
    end

    {activities, activity_results} = run_activities(actions, engine)
    context =
      append_activity_results(
        context,
        all_actions,
        Map.merge(memo_results, activity_results)
      )

    engine = put_in(engine.environment.activities, activities ++ engine.environment.activities)

    %{
      engine
      | context: context,
        iterations: engine.iterations + 1,
        job: refresh_job(engine.job)
    }
    |> verifiable()
    |> loop()
  end

  defp run_activities(actions, engine, opts \\ []) do
    results =
      Tracking.async_stream(
        actions,
        &spawn_activity(&1, engine),
        Keyword.merge([max_concurrency: 10, timeout: :timer.hours(4)], opts)
      )

    actions
    |> Enum.zip(results)
    |> Enum.reduce({[], %{}}, fn
      {action, {:ok, {:ok, %WorkbenchJobActivity{} = activity}}}, {activities, results} ->
        {
          [activity | activities],
          put_activity_result(results, action, activity_result(action, activity))
        }

      {action, {:ok, {:error, error}}}, {activities, results} ->
        Logger.error("Error spawning activity: #{inspect(error)}")
        {activities, put_activity_result(results, action, failed_activity_result(action, error))}

      {action, error}, {activities, results} ->
        Logger.error("Error spawning activity: #{inspect(error)}")
        {activities, put_activity_result(results, action, failed_activity_result(action, error))}
    end)
    |> then(fn {activities, results} -> {Enum.reverse(activities), results} end)
  end

  defp activity_result(%Notes{} = notes, %WorkbenchJobActivity{}),
    do: tool_result(notes, String.trim(notes_message(notes: notes)))

  defp activity_result(action, %WorkbenchJobActivity{} = activity) do
    case Message.to_message(activity) do
      {:tool, content, _} when is_binary(content) -> tool_result(action, content)
      {:assistant, content} when is_binary(content) -> tool_result(action, content)
      _ -> failed_activity_result(action, "activity produced no output")
    end
  end

  defp failed_activity_result(action, error),
    do: tool_result(action, "failed to run activity: #{inspect(error)}")

  defp tool_result(
         %{id: %Console.AI.Tool{id: id, name: name}},
         content
       )
       when is_binary(id) and is_binary(name) and is_binary(content),
       do: Context.tool_result(id, name, content)

  defp tool_result(_, _), do: nil

  defp put_activity_result(results, action, %ReqLLM.Message{} = result) do
    case action_call_id(action) do
      id when is_binary(id) -> Map.put(results, id, result)
      _ -> results
    end
  end
  defp put_activity_result(results, _, _), do: results

  defp append_activity_results(%Context{} = context, actions, results) do
    Enum.reduce(actions, context, fn action, context ->
      case Map.fetch(results, action_call_id(action)) do
        {:ok, %ReqLLM.Message{} = result} ->
          append_tool_result(context, result)

        :error ->
          case failed_activity_result(action, "activity produced no result") do
            %ReqLLM.Message{} = result -> append_tool_result(context, result)
            _ -> context
          end
      end
    end)
  end

  defp append_tool_result(
         %Context{} = context,
         %ReqLLM.Message{role: :tool} = result
       ),
       do: Context.append(context, result)

  defp action_call_id(%{id: %Console.AI.Tool{id: id}}), do: id
  defp action_call_id(_), do: nil

  @supported_subagents ~w(infrastructure integration coding observability monitoring memory skill history search verify self_service)a

  defp spawn_activity(action, %__MODULE__{job: job} = engine) do
    Tracking.with_activity(action, job, fn ->
      do_spawn_activity(action, engine)
    end)
  end

  defp do_spawn_activity(
         %Subagent{subagent: type, prompt: prompt} = call,
         %__MODULE__{job: job, environment: %Environment{} = environment}
       )
      when type in @supported_subagents do
    module = subagent_module(type)
    Console.AI.Provider.external_errors()
    Console.AI.Tool.context(runtime: job.workbench.agent_runtime, user: job.user, job: job)
    with {:ok, activity} <- Workbenches.create_job_activity(%{type: type, prompt: prompt, tool_call: tool_attrs(call)}, job) do
      # stream_callbacks(activity)
      Console.safely(fn ->
        module.run(activity, job, environment)
      end, &crash_fallback/1)
      |> Workbenches.update_job_activity(activity)
      |> log_error("Failed to update job activity")
    end
  end

  defp do_spawn_activity(
         %SkillBackfill{prompt: prompt} = call,
         %__MODULE__{job: job, environment: %Environment{} = environment}
       ) do
    Console.AI.Tool.context(runtime: job.workbench.agent_runtime, user: job.user, job: job)
    Console.AI.Provider.external_errors()

    with {:ok, activity} <- Workbenches.create_job_activity(%{type: :skill, prompt: prompt, tool_call: tool_attrs(call)}, job) do
      # stream_callbacks(activity)
      Console.safely(fn ->
        SA.Skill.run(activity, job, environment)
      end, &crash_fallback/1)
      |> Workbenches.update_job_activity(activity)
      |> log_error("Failed to update job activity")
    end
  end

  defp do_spawn_activity(
         %CanvasTool{prompt: prompt} = call,
         %__MODULE__{job: job, environment: %Environment{} = environment}
       ) do
    Console.AI.Tool.context(runtime: job.workbench.agent_runtime, user: job.user)
    Console.AI.Provider.external_errors()
    with {:ok, activity} <- Workbenches.create_job_activity(%{type: :canvas, prompt: prompt, tool_call: tool_attrs(call)}, job) do
      Canvas.new(activity, existing_canvas(job))

      output = Console.safely(fn ->
        SA.Canvas.run(activity, job, environment)
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

  defp do_spawn_activity(%Notes{status: status, summary: summary} = call, %__MODULE__{job: job}) do
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

  defp do_spawn_activity(%FunctionCall{} = call, %__MODULE__{user: user}) do
    case FunctionCall.invoke(call) do
      {:ok, %WorkbenchJobActivity{status: :successful} = activity} -> {:ok, activity}
      {:ok, %WorkbenchJobActivity{status: :needs_approval} = activity} -> poll_activity(activity, user)
      {:error, error} -> {:error, error}
    end
  end

  defp do_spawn_activity(%KubeRequest{handle: handle, method: m, path: p} = request, %__MODULE__{user: user, job: job}) do
    attrs = %{
      type: :kubernetes,
      status: :needs_approval,
      prompt: "dispatching kubernetes #{m} request against #{p} on cluster #{handle}",
      tool_call: tool_attrs(request),
      result: Map.merge(%{
        output: "request pending user approval",
        explanation: request.explanation,
        kube_request: Console.mapify(request)
      }, Approval.attrs(request.approval))
    }
    with {:ok, activity} <- Workbenches.create_job_activity(attrs, job),
      do: poll_activity(activity, user)
  end

  defp do_spawn_activity(%KubeDrain{handle: handle, node: node} = request, %__MODULE__{user: user, job: job}) do
    attrs = %{
      type: :kubernetes,
      status: :needs_approval,
      prompt: "draining kubernetes node #{node} on cluster #{handle}",
      tool_call: tool_attrs(request),
      result: Map.merge(%{
        output: "request pending user approval",
        explanation: request.explanation,
        kube_drain: Console.mapify(request)
      }, Approval.attrs(request.approval))
    }
    with {:ok, activity} <- Workbenches.create_job_activity(attrs, job),
      do: poll_activity(activity, user)
  end

  defp do_spawn_activity(%KubeShell{handle: handle, pod: p, container: ct, command: command} = request, %__MODULE__{user: user, job: job}) do
    attrs = %{
      type: :exec,
      status: :needs_approval,
      prompt: "dispatching kubernetes exec command `#{command}` against #{p} in container #{ct} on cluster #{handle}",
      tool_call: tool_attrs(request),
      result: Map.merge(%{
        output: "request pending user approval",
        explanation: request.explanation,
        kube_exec: Console.mapify(request)
      }, Approval.attrs(request.approval))
    }
    with {:ok, activity} <- Workbenches.create_job_activity(attrs, job),
      do: poll_activity(activity, user)
  end

  defp do_spawn_activity(_, _), do: :ignore

  defp poll_activity(%WorkbenchJobActivity{} = activity, %User{} = user) do
    with {:ok, %WorkbenchJobActivity{} = activity} <- Workbenches.auto_approve_activity(activity, user),
         {:ok, %WorkbenchJobActivity{} = activity} <- Activity.await_activity(activity) do
      {:ok, Repo.preload(activity, [:workbench_job, :agent_run, :agent_runs, :thoughts, :user])}
    end
  end

  defp existing_canvas(%WorkbenchJob{result: %Console.Schema.WorkbenchJobResult{canvas: canvas}}) when is_list(canvas), do: canvas
  defp existing_canvas(_), do: []

  defp crash_fallback(err) do
    %{status: :failed, result: %{error: "error running subagent: #{inspect(err)}, feel free to try again if it is still necessary"}}
  end

  defp subagent_module(:infrastructure), do: SA.Infrastructure
  defp subagent_module(:integration), do: SA.Integration
  defp subagent_module(:coding), do: SA.Coding
  defp subagent_module(:observability), do: SA.Observability
  defp subagent_module(:monitoring), do: SA.Monitoring
  defp subagent_module(:memory), do: SA.Memory
  defp subagent_module(:history), do: SA.History
  defp subagent_module(:skill), do: SA.Skill
  defp subagent_module(:search), do: SA.Search
  defp subagent_module(:verify), do: SA.Verify
  defp subagent_module(:self_service), do: SA.SelfService

  defp tool_attrs(%{id: %Console.AI.Tool{id: id, name: name, arguments: arguments}}) when is_binary(id) and is_binary(name),
    do: %{call_id: id, name: name, arguments: arguments}
  defp tool_attrs(_), do: nil

  defp workbench_context(%__MODULE__{context: %Context{} = context}), do: context
  defp workbench_context(%__MODULE__{
         job: %WorkbenchJob{} = job,
         environment: %Environment{activities: activities}
       }) do
    activities
    |> Enum.reverse()
    |> Enum.map(&Message.to_message/1)
    |> then(&ProviderBase.reqllm_messages([{:user, job.prompt} | &1]))
  end

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

  defp tools(%WorkbenchJob{} = job, %Environment{skills: skills} = env, activities) do
    subagents = Environment.subagents(env)
                |> maybe_add_memory(activities)

    categories = Environment.categories(job)
    skills = Environment.with_builtins(skills) |> Environment.subagent_skills(:orchestrator)

    skill_knowledge_tools(job, skills) ++ [
      %KnowledgeUpsert{job: job},
      %KnowledgeDelete{job: job},
      %Subagents{bench: job.workbench, job: job, subagents: subagents, categories: categories},
      %Subagent{subagents: subagents},
      %FetchNotes{job: job},
      %Codemode{tools: []},
      Notes,
      %Complete{job: job, user: env.user},
    ] ++ type_tools(job)
      ++ function_tools(env)
      ++ kube_tools(job)
      ++ include_backfill(job)
  end

  defp include_backfill(%WorkbenchJob{result: %{conclusion: c}}) when is_binary(c) and byte_size(c) > 0, do: [SkillBackfill]
  defp include_backfill(_), do: []

  defp type_tools(%WorkbenchJob{type: :skill}), do: []
  defp type_tools(_), do: [CanvasTool]

  defp function_tools(%Environment{job: job, functions: [_ | _] = funcs}),
    do: Tools.function_tools(funcs, job)
  defp function_tools(_), do: []

  defp kube_tools(
    %WorkbenchJob{modes: %{kubernetes: %{update: u, delete: d, exec: e, drain: drain}}} = job
  ) do
    Enum.reject([
      (if u, do: %KubeUpdate{job: job, user: job.user}, else: nil),
      (if d, do: %KubeDelete{job: job, user: job.user}, else: nil),
      (if e, do: %KubeExec{job: job, user: job.user}, else: nil),
      (if drain, do: %KubeDrainTool{job: job, user: job.user}, else: nil)
    ], &is_nil/1)
  end
  defp kube_tools(_), do: []

  defp sysprompt(%WorkbenchJob{type: :skill, referenced_job: job} = workbench_job, _, _),
    do: String.trim(skill_system_prompt(job: job, prompt: WorkbenchJob.objective(workbench_job)))
  defp sysprompt(%WorkbenchJob{} = job, environment, engine) do
    String.trim(system_prompt(
      job: job,
      engine: engine,
      actions: Environment.actions(environment),
      review: WorkbenchJob.coding_review?(job),
      self_service: :self_service in Environment.subagents(environment)
    ))
  end

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

  @preloads [:result, :flow, :pull_requests, chatbot_message: [:chat_connection], user: [:groups], workbench: [:workbench_skills, :repository, :agent_runtime, [tools: [:mcp_server, :cloud_connection, :scm_connection]]]]

  defp verifiable(
         %__MODULE__{
           environment: %Environment{activities: activities},
           job: %WorkbenchJob{pull_requests: prs}
         } = engine
       ) do
    verifiable =
      (is_list(prs) && Enum.any?(prs, & &1.status == :merged)) ||
      (is_list(activities) && Enum.any?(activities, & &1.status == :successful && is_action(&1.type)))

    put_in(engine.environment.verifiable, verifiable)
    |> Map.put(:verifiable, verifiable)
  end
  defp verifiable(engine), do: engine

  defp preload_job(%WorkbenchJob{type: :skill} = job),
    do:
      Repo.preload(
        job,
        @preloads ++
          [
            referenced_job: [
              :result,
              {:eval_result, :workbench_eval},
              {:workbench, [:workbench_skills, :repository]},
              {:activities, :thoughts}
            ]
          ]
      )
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
  EEx.function_from_file(:defp, :notes_message, Console.priv_filename(["prompts", "workbench", "notes_message.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :system_prompt, Console.priv_filename(["prompts", "workbench", "job.md.eex"]), [:assigns])
end
