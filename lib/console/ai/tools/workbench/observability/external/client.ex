defmodule Console.AI.Tools.Workbench.Observability.External.Client do
  @moduledoc false

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Observability.External.{
    Azure,
    Cloudwatch,
    Datadog,
    Dynatrace,
    Sentry,
    Splunk
  }

  @providers %{
    azure: Azure,
    cloudwatch: Cloudwatch,
    datadog: Datadog,
    dynatrace: Dynatrace,
    sentry: Sentry,
    splunk: Splunk
  }

  def supports?(%WorkbenchTool{tool: tool}), do: Map.has_key?(@providers, tool)

  def list_dashboards(%WorkbenchTool{} = tool, q, limit, scope \\ nil, cursor \\ nil) do
    with {:ok, provider} <- provider(tool) do
      provider.list_dashboards(tool,
        q: q,
        limit: limit,
        scope: scope,
        cursor: cursor
      )
    end
  end

  def get_dashboard(%WorkbenchTool{} = tool, dashboard_id, scope \\ nil) do
    with {:ok, provider} <- provider(tool) do
      provider.get_dashboard(tool, dashboard_id, scope: scope)
    end
  end

  def list_monitors(%WorkbenchTool{} = tool, q, limit, scope \\ nil, cursor \\ nil) do
    with {:ok, provider} <- provider(tool) do
      provider.list_monitors(tool,
        q: q,
        limit: limit,
        scope: scope,
        cursor: cursor
      )
    end
  end

  def get_monitor(%WorkbenchTool{} = tool, monitor_id, scope \\ nil) do
    with {:ok, provider} <- provider(tool) do
      provider.get_monitor(tool, monitor_id, scope: scope)
    end
  end

  defp provider(%WorkbenchTool{tool: tool}) do
    case Map.fetch(@providers, tool) do
      {:ok, provider} -> {:ok, provider}
      :error -> {:error, "external observability resources are not supported for this tool"}
    end
  end
end
