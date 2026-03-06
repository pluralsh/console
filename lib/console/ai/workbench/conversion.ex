defmodule Console.AI.Workbench.Conversion do
  alias Console.Schema.WorkbenchTool
  alias Toolquery.{
    ToolConnection,
    DatadogConnection,
    PrometheusConnection,
    LokiConnection,
    TempoConnection,
    ElasticConnection,
  }

  @spec to_proto(WorkbenchTool.t()) :: {:ok, %ToolConnection{}} | {:error, String.t()}
  def to_proto(%WorkbenchTool{tool: :datadog, configuration: %{datadog: %{} = dd}}) do
    {:ok, %ToolConnection{
      connection: %DatadogConnection{
        site: dd.site,
        apiKey: dd.api_key,
        appKey: dd.app_key,
      }
    }}
  end

  def to_proto(%WorkbenchTool{tool: :prometheus, configuration: %{prometheus: %{} = prom}}) do
    {:ok, %ToolConnection{
      connection: %PrometheusConnection{
        url: prom.url,
        token: prom.token,
        username: prom.username,
        password: prom.password,
        tenant_id: prom.tenant_id,
      }
    }}
  end

  def to_proto(%WorkbenchTool{tool: :loki, configuration: %{loki: %{} = loki}}) do
    {:ok, %ToolConnection{
      connection: %LokiConnection{
        url: loki.url,
        token: loki.token,
        username: loki.username,
        password: loki.password,
        tenant_id: loki.tenant_id,
      }
    }}
  end

  def to_proto(%WorkbenchTool{tool: :tempo, configuration: %{tempo: %{} = tempo}}) do
    {:ok, %ToolConnection{
      connection: %TempoConnection{
        url: tempo.url,
        token: tempo.token,
        username: tempo.username,
        password: tempo.password,
        tenant_id: tempo.tenant_id,
      }
    }}
  end

  def to_proto(%WorkbenchTool{tool: :elastic, configuration: %{elastic: %{} = elastic}}) do
    {:ok, %ToolConnection{
      connection: %ElasticConnection{
        url:      elastic.url,
        username: elastic.username,
        password: elastic.password,
        index:    elastic.index,
      }
    }}
  end

  def to_proto(_), do: {:error, "No tool connection found"}
end
