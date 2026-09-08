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

  def traces(resource, name, args, %User{} = user) when is_struct(resource, WorkbenchJob) or is_struct(resource, Workbench),
    do: execute(resource, name, args, user, @traces_tools)

  def labels(%Workbench{} = workbench, name, args, %User{} = user),
    do: execute(workbench, name, args, user, @label_tools)

  defp execute(resource, name, args, user, allowed) do
    {tools, environment} = execution(resource, user)
    Tool.context(user: Rbac.preload(user), job: environment.job)

    with tool when not is_nil(tool) <- Enum.find(tools, & Tool.name(&1) == name),
         {:ok, tool} <- Tool.policy(tool, args, environment.policies),
         {:ok, %mod{} = t} <- Tool.validate(tool, args),
         true <- mod in allowed do
      mod.structured(t)
    else
      {:error, err} -> {:error, "failed to call tool: #{name}, result: #{inspect(err)}"}
      nil -> {:error, "tool not found"}
      _ -> {:error, "tool not valid for querying on the fly"}
    end
  end

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
end
