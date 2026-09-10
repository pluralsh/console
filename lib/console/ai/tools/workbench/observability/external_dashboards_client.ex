defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboards.Client do
  @moduledoc false

  alias Console.Schema.WorkbenchTool
  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.{
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

  def list(%WorkbenchTool{} = tool, q, limit, scope \\ nil, cursor \\ nil) do
    with {:ok, provider} <- provider(tool) do
      provider.list(tool,
        q: q,
        limit: limit,
        scope: scope,
        cursor: cursor
      )
    end
  end

  def get(%WorkbenchTool{} = tool, dashboard_id, scope \\ nil) do
    with {:ok, provider} <- provider(tool) do
      provider.get(tool, dashboard_id, scope: scope)
    end
  end

  defp provider(%WorkbenchTool{tool: tool}) do
    case Map.fetch(@providers, tool) do
      {:ok, provider} -> {:ok, provider}
      :error -> {:error, "external dashboards are not supported for this tool"}
    end
  end
end
