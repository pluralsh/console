defmodule Console.AI.Workbench.Toolchain do
  @moduledoc """
  Allows on-the-fly querying of tools within a workbench
  """
  alias Console.Repo
  alias Console.Schema.{WorkbenchJob}
  alias Console.AI.Tool
  alias Console.AI.Workbench.{Environment, Subagents}
  alias Console.AI.Tools.Workbench.Observability

  @metrics_tools [Observability.Metrics, Observability.Plrl.Metrics]

  def metrics(%WorkbenchJob{} = job, name, args) do
    env = env(job)
    tools = Subagents.Observability.tools(env)
    with tool when not is_nil(tool) <- Enum.find(tools, & Tool.name(&1) == name),
         {:ok, %mod{} = t} when mod in @metrics_tools <- Tool.validate(tool, args) do
      mod.structured(t)
    else
      {:error, _} = err -> err
      nil -> {:error, "tool not found"}
      _ -> {:error, "tool not valid for querying on the fly"}
    end
  end

  defp env(%WorkbenchJob{} = job) do
    job = Repo.preload(job, [workbench: [tools: :mcp_server]])
    Environment.new(job, job.workbench.tools, [])
  end
end
