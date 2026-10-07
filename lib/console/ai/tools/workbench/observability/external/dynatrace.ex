defmodule Console.AI.Tools.Workbench.Observability.External.Dynatrace do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.External.Support
  alias Console.Schema.WorkbenchTool

  @monitor_schema_ids "builtin:davis.anomaly-detectors,builtin:anomaly-detection.metric-events"
  @monitor_fields "objectId,schemaId,summary,searchSummary,scope,value"

  def list_dashboards(%WorkbenchTool{configuration: %{dynatrace: %{} = config}}, opts) do
    with {:ok, %{"documents" => documents} = result} <-
           request(config, "/platform/document/v1/documents",
             params:
               Support.params(%{
                 "filter" => dashboard_filter(opts[:q]),
                 "page-size" => opts[:limit],
                 "page-key" => opts[:cursor]
               })
           ) do
      dashboards = Enum.map(documents, &normalize_dashboard/1)
      {:ok, Support.page(:dashboards, dashboards, opts, next_cursor: result["nextPageKey"])}
    end
  end

  def get_dashboard(
        %WorkbenchTool{configuration: %{dynatrace: %{} = config}},
        dashboard_id,
        _opts
      ) do
    with {:ok, dashboard} <-
           request(
             config,
             "/platform/document/v1/documents/#{Support.encode_path(dashboard_id)}"
           ) do
      {:ok, normalize_dashboard(dashboard)}
    end
  end

  def list_monitors(%WorkbenchTool{configuration: %{dynatrace: %{} = config}}, opts) do
    with {:ok, %{"items" => items} = result} <-
           request(config, "/platform/classic/environment-api/v2/settings/objects",
             params: monitor_params(opts)
           ) do
      monitors = Enum.map(items, &normalize_monitor/1)
      total = result["totalCount"]

      {:ok,
       Support.page(:monitors, monitors, opts,
         total: total,
         next_cursor: result["nextPageKey"]
       )}
    end
  end

  def get_monitor(
        %WorkbenchTool{configuration: %{dynatrace: %{} = config}},
        monitor_id,
        _opts
      ) do
    with {:ok, monitor} <-
           request(
             config,
             "/platform/classic/environment-api/v2/settings/objects/#{Support.encode_path(monitor_id)}"
           ) do
      {:ok, normalize_monitor(monitor)}
    end
  end

  defp request(config, path, opts \\ [])

  defp request(%{url: url, platform_token: token}, path, opts)
       when is_binary(url) and byte_size(url) > 0 and is_binary(token) and
              byte_size(token) > 0 do
    Req.new(
      base_url: String.trim_trailing(url, "/"),
      auth: {:bearer, token},
      headers: %{"accept" => "application/json"}
    )
    |> then(&Support.request(__MODULE__, &1, :get, path, opts))
  end

  defp request(_, _, _),
    do: {:error, "dynatrace access requires a URL and platform token"}

  defp monitor_params(opts) do
    case opts[:cursor] do
      cursor when cursor in [nil, ""] ->
        Support.params(%{
          "schemaIds" => @monitor_schema_ids,
          "pageSize" => opts[:limit],
          "fields" => @monitor_fields,
          "filter" => monitor_filter(opts[:q])
        })

      cursor ->
        %{"nextPageKey" => cursor}
    end
  end

  defp dashboard_filter(q) when is_binary(q) and byte_size(q) > 0,
    do: "type = 'dashboard' and name contains '#{escape_filter(q)}'"

  defp dashboard_filter(_), do: "type = 'dashboard'"

  defp monitor_filter(q) when is_binary(q) and byte_size(q) > 0 do
    escaped = escape_filter(q)
    "value.title contains '#{escaped}' or value.summary contains '#{escaped}'"
  end

  defp monitor_filter(_), do: nil

  defp escape_filter(value) do
    value
    |> String.replace("\\", "\\\\")
    |> String.replace("'", "\\'")
  end

  defp normalize_dashboard(document) do
    content =
      case document["content"] do
        content when is_map(content) -> content
        content when is_binary(content) ->
          case Jason.decode(content) do
            {:ok, decoded} -> decoded
            _ -> %{"content" => content}
          end
        _ -> document
      end

    Support.item(
      document["id"],
      document["name"] || content["name"],
      document["description"] || content["description"],
      nil,
      content
    )
  end

  defp normalize_monitor(object) do
    value = object["value"] || %{}

    Support.item(
      object["objectId"],
      value["title"] || value["summary"] || object["summary"],
      value["description"] || object["searchSummary"],
      nil,
      object
    )
  end
end
