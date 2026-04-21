defmodule Console.AI.Workbench.Conversion do
  alias Console.Schema.WorkbenchTool
  alias Toolquery.{
    ToolConnection,
    DatadogConnection,
    PrometheusConnection,
    LokiConnection,
    SplunkConnection,
    TempoConnection,
    JaegerConnection,
    ElasticConnection,
    DynatraceConnection,
    CloudwatchConnection,
    AzureConnection,
  }

  @spec to_proto(WorkbenchTool.t()) :: {:ok, %ToolConnection{}} | {:error, String.t()}
  def to_proto(%WorkbenchTool{tool: :datadog, configuration: %{datadog: %{} = dd}}) do
    {:ok, %ToolConnection{
      connection: {:datadog, %DatadogConnection{
        site: dd.site,
        apiKey: dd.api_key,
        appKey: dd.app_key,
      }}
    }}
  end

  def to_proto(%WorkbenchTool{tool: :prometheus, configuration: %{prometheus: %{} = prom}}) do
    {:ok, %ToolConnection{
      connection: {:prometheus, %PrometheusConnection{
        url: prom.url,
        token: prom.token,
        username: prom.username,
        password: prom.password,
        tenant_id: prom.tenant_id,
      }}
    }}
  end

  def to_proto(%WorkbenchTool{tool: :loki, configuration: %{loki: %{} = loki}}) do
    {:ok, %ToolConnection{
      connection: {:loki, %LokiConnection{
        url: loki.url,
        token: loki.token,
        username: loki.username,
        password: loki.password,
        tenant_id: loki.tenant_id,
      }}
    }}
  end

  def to_proto(%WorkbenchTool{tool: :splunk, configuration: %{splunk: %{} = splunk}}) do
    {:ok, %ToolConnection{
      connection: {:splunk, %SplunkConnection{
        url: splunk.url,
        token: splunk.token,
        username: splunk.username,
        password: splunk.password,
      }}
    }}
  end

  def to_proto(%WorkbenchTool{tool: :tempo, configuration: %{tempo: %{} = tempo}}) do
    {:ok, %ToolConnection{
      connection: {:tempo, %TempoConnection{
        url: tempo.url,
        token: tempo.token,
        username: tempo.username,
        password: tempo.password,
        tenant_id: tempo.tenant_id,
      }}
    }}
  end

  def to_proto(%WorkbenchTool{tool: :jaeger, configuration: %{jaeger: %{} = jaeger}}) do
    {:ok, %ToolConnection{
      connection: {:jaeger, %JaegerConnection{
        url: jaeger.url,
        token: jaeger.token,
        username: jaeger.username,
        password: jaeger.password,
      }}
    }}
  end

  def to_proto(%WorkbenchTool{tool: :elastic, configuration: %{elastic: %{} = elastic}}) do
    {:ok, %ToolConnection{
      connection: {:elastic, %ElasticConnection{
        url:      elastic.url,
        username: elastic.username,
        password: elastic.password,
        index:    elastic.index,
      }}
    }}
  end

  def to_proto(%WorkbenchTool{tool: :dynatrace, configuration: %{dynatrace: %{} = dynatrace}}) do
    {:ok, %ToolConnection{
      connection: {:dynatrace, %DynatraceConnection{
        url: dynatrace.url,
        platformToken: dynatrace.platform_token,
      }}
    }}
  end

  def to_proto(%WorkbenchTool{tool: :cloudwatch, configuration: %{cloudwatch: %{} = cloudwatch}}) do
    {:ok, %ToolConnection{
      connection: {:cloudwatch, %CloudwatchConnection{
        region: cloudwatch.region,
        log_group_names: cloudwatch.log_group_names || [],
        access_key_id: cloudwatch.access_key_id,
        secret_access_key: cloudwatch.secret_access_key,
        role_arn: cloudwatch.role_arn,
        external_id: cloudwatch.external_id,
        role_session_name: cloudwatch.role_session_name,
      }}
    }}
  end

  def to_proto(%WorkbenchTool{tool: :azure, configuration: %{azure: %{} = azure}}) do
    {:ok, %ToolConnection{
      connection: {:azure, %AzureConnection{
        subscription_id: azure.subscription_id,
        tenant_id: azure.tenant_id,
        client_id: azure.client_id,
        client_secret: azure.client_secret,
      }}
    }}
  end

  def to_proto(_), do: {:error, "No tool connection found"}
end
