defmodule Console.AI.Workbench.Toolchain do
  @moduledoc """
  Allows on-the-fly querying of tools within a workbench
  """
  alias Console.Repo
  alias Console.Schema.{Workbench, WorkbenchJob, WorkbenchTool, User}
  alias Console.AI.Tool
  alias Console.AI.Workbench.{Environment, Subagents}
  alias Console.AI.Tools.Workbench.Observability
  alias Console.Services.Rbac

  @metrics_tools [Observability.Metrics, Observability.Plrl.Metrics]
  @logs_tools [Observability.Logs, Observability.Plrl.Logs]
  @log_aggregate_tools [Observability.LogAggregate, Observability.Plrl.LogsAggregate]
  @traces_tools [Observability.Traces]
  @label_tools [
    Observability.MetricsLabelSearch,
    Observability.Plrl.MetricsLabelSearch,
    Observability.Plrl.LogLabels
  ]

  @doc """
  Runs a metrics, logs or traces tool on the fly. A nil user is an anonymous caller (public dashboards):
  Plural-native log tools are unavailable to it, and the call fails closed whenever any workbench policy
  matches the tool, since policies can't be evaluated without an actor.
  """
  def metrics(resource, name, args, user)
      when (is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench)) and (is_nil(user) or is_struct(user, User)),
    do: execute(resource, name, args, user, @metrics_tools)

  @doc "Runs a logs tool on the fly; a nil user is anonymous, see metrics/4."
  def logs(resource, name, args, user)
      when (is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench)) and (is_nil(user) or is_struct(user, User)),
    do: execute(resource, name, args, user, @logs_tools)

  def log_aggregate(resource, name, args, %User{} = user)
      when is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench),
      do: execute(resource, name, args, user, @log_aggregate_tools)

  @doc "Runs a traces tool on the fly; a nil user is anonymous, see metrics/4."
  def traces(resource, name, args, user)
      when (is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench)) and (is_nil(user) or is_struct(user, User)),
    do: execute(resource, name, args, user, @traces_tools)

  def labels(%Workbench{} = workbench, name, args, %User{} = user),
    do: execute(workbench, name, args, user, @label_tools)

  @doc "Validates that a named tool exists, accepts the arguments, and supports the requested query type."
  def validate(resource, type, name, args, %User{} = user)
      when (is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench)) and
             type in [:metrics, :logs, :log_aggregate, :traces, :labels] do
    validate_call(resource, name, args, user, allowed_tools(type))
  end

  def validate_all(resource, queries, %User{} = user)
      when (is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench)) and is_list(queries) do
    Enum.reduce_while(queries, :ok, fn {type, name, args}, :ok ->
      case validate(resource, type, name, args, user) do
        {:ok, _} -> {:cont, :ok}
        {:error, _} = error -> {:halt, error}
      end
    end)
  end

  @doc "Validates a named observability tool call and returns its configured workbench tool, if any."
  def resolve_workbench_tool(resource, type, name, args, %User{} = user)
      when (is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench)) and
             type in [:metrics, :logs, :log_aggregate, :traces, :labels] do
    with {:ok, tool} <- validate_call(resource, name, args, user, allowed_tools(type)) do
      case Map.get(tool, :tool) do
        %WorkbenchTool{} = workbench_tool -> {:ok, workbench_tool}
        _ -> {:ok, nil}
      end
    end
  end

  @doc "Validates the persisted observability queries attached to a subagent or workbench result."
  def validate_result(resource, result, %User{} = user)
      when is_map(result) do
    validate_all(resource, result_queries(result), user)
  end

  defp result_queries(result) do
    [
      {:metrics, [Map.get(result, :metrics_query) | Map.get(result, :metrics_queries, [])]},
      {:logs, Map.get(result, :logs_queries, [])},
      {:traces, [Map.get(result, :traces_query) | Map.get(result, :traces_queries, [])]}
    ]
    |> Enum.flat_map(fn {type, queries} ->
      Enum.flat_map(queries, fn
        nil -> []
        query -> [{type, query.tool_name, query.tool_args || %{}}]
      end)
    end)
  end

  defp execute(resource, name, args, user, allowed) do
    with {:ok, %mod{} = tool} <- validate_call(resource, name, args, user, allowed) do
      tool
      |> mod.structured()
      |> normalize_error()
    end
  end

  defp validate_call(resource, name, args, user, allowed) do
    {tools, environment} = execution(resource, user)
    Tool.context(user: Rbac.preload(user), job: environment.job)

    with tool when not is_nil(tool) <- Enum.find(tools, & Tool.name(&1) == name),
         :ok <- anonymous_policy_check(user, tool, environment.policies),
         {:ok, tool} <- Tool.policy(tool, args, environment.policies),
         {:ok, %mod{} = t} <- Tool.validate(tool, args),
         true <- mod in allowed do
      {:ok, t}
    else
      {:error, :policy_governed} -> {:error, "tool #{name} is governed by workbench policies and is unavailable without an authenticated user"}
      {:error, err} -> {:error, "failed to call tool: #{name}, result: #{inspect(err)}"}
      nil -> {:error, "tool #{name} not found"}
      _ -> {:error, "tool #{name} not valid for querying on the fly"}
    end
  end

  # Policies are evaluated against the calling actor, which doesn't exist for anonymous callers,
  # so fail closed whenever any workbench policy governs the tool.
  defp anonymous_policy_check(nil, tool, policies) do
    if Enum.any?(policies, &Tool.Policy.matches?(&1, Tool.name(tool))),
      do: {:error, :policy_governed},
      else: :ok
  end
  defp anonymous_policy_check(_, _, _), do: :ok

  defp allowed_tools(:metrics), do: @metrics_tools
  defp allowed_tools(:logs), do: @logs_tools
  defp allowed_tools(:log_aggregate), do: @log_aggregate_tools
  defp allowed_tools(:traces), do: @traces_tools
  defp allowed_tools(:labels), do: @label_tools

  defp execution(%WorkbenchJob{} = job, user) do
    environment = env(job)
    {Subagents.Observability.tools(environment, user), environment}
  end

  defp execution(%Workbench{} = workbench, user) when is_nil(user) or is_struct(user, User) do
    workbench = Repo.preload(workbench, [tools: :mcp_server])
    job = %WorkbenchJob{workbench_id: workbench.id, workbench: workbench, user: user}
    environment = Environment.new(job, workbench.tools, [])
    {Subagents.Observability.core_tools(job, environment, user), environment}
  end

  defp env(%WorkbenchJob{} = job) do
    job = Repo.preload(job, [workbench: [tools: :mcp_server]])
    Environment.new(job, job.workbench.tools, [])
  end

  defp normalize_error({:error, %GRPC.RPCError{message: message}}) when is_binary(message),
    do: {:error, message}

  defp normalize_error(result), do: result
end
