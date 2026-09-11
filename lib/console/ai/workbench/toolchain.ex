defmodule Console.AI.Workbench.Toolchain do
  @moduledoc """
  Allows on-the-fly querying of tools within a workbench
  """
  alias Console.Repo
  alias Console.Schema.{Workbench, WorkbenchJob, User}
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

  def metrics(resource, name, args, %User{} = user) when is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench),
    do: execute(resource, name, args, user, @metrics_tools)

  def logs(resource, name, args, %User{} = user) when is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench),
    do: execute(resource, name, args, user, @logs_tools)

  def log_aggregate(resource, name, args, %User{} = user)
      when is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench),
      do: execute(resource, name, args, user, @log_aggregate_tools)

  def traces(resource, name, args, %User{} = user) when is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench),
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
         {:ok, tool} <- Tool.policy(tool, args, environment.policies),
         {:ok, %mod{} = t} <- Tool.validate(tool, args),
         true <- mod in allowed do
      {:ok, t}
    else
      {:error, err} -> {:error, "failed to call tool: #{name}, result: #{inspect(err)}"}
      nil -> {:error, "tool not found"}
      _ -> {:error, "tool not valid for querying on the fly"}
    end
  end

  defp allowed_tools(:metrics), do: @metrics_tools
  defp allowed_tools(:logs), do: @logs_tools
  defp allowed_tools(:log_aggregate), do: @log_aggregate_tools
  defp allowed_tools(:traces), do: @traces_tools
  defp allowed_tools(:labels), do: @label_tools

  defp execution(%WorkbenchJob{} = job, user) do
    environment = env(job)
    {Subagents.Observability.tools(environment, user), environment}
  end

  defp execution(%Workbench{} = workbench, %User{} = user) do
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
