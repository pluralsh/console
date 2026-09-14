defmodule Console.AI.Tools.Workbench.Observability.External.Datadog do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.External.Support
  alias Console.Schema.WorkbenchTool

  def list_dashboards(
        %WorkbenchTool{configuration: %{datadog: %{} = config}},
        opts
      ) do
    with :ok <- credentials(config),
         :ok <- Support.unsupported_search(opts, "datadog", "dashboard"),
         {:ok, offset} <- Support.offset_cursor(opts[:cursor]),
         {:ok, %{"dashboards" => dashboards} = result} <-
           request(config, "/api/v1/dashboard",
             params: %{"count" => opts[:limit], "start" => offset}
           ) do
      dashboards = Enum.map(dashboards, &normalize_dashboard/1)
      total = result["total"]
      next_cursor = Support.next_offset_cursor(offset, length(dashboards), total)
      {:ok, Support.page(:dashboards, dashboards, opts, total: total, next_cursor: next_cursor)}
    end
  end

  def get_dashboard(
        %WorkbenchTool{configuration: %{datadog: %{} = config}},
        dashboard_id,
        _opts
      ) do
    with :ok <- credentials(config),
         {:ok, dashboard} <-
           request(
             config,
             "/api/v1/dashboard/#{Support.encode_path(dashboard_id)}"
           ) do
      {:ok, normalize_dashboard(dashboard)}
    end
  end

  def list_monitors(
        %WorkbenchTool{configuration: %{datadog: %{} = config}},
        opts
      ) do
    with :ok <- credentials(config),
         {:ok, page} <- Support.offset_cursor(opts[:cursor]),
         {:ok, result} <-
           request(config, "/api/v1/monitor/search",
             params:
               Support.params(%{
                 "query" => opts[:q],
                 "page" => page,
                 "per_page" => opts[:limit]
               })
           ) do
      monitors = Enum.map(result["monitors"] || [], &normalize_monitor/1)
      total = get_in(result, ["metadata", "total_count"])
      next_cursor = Support.next_page_cursor(page, length(monitors), opts[:limit], total)

      {:ok, Support.page(:monitors, monitors, opts, total: total, next_cursor: next_cursor)}
    end
  end

  def get_monitor(
        %WorkbenchTool{configuration: %{datadog: %{} = config}},
        monitor_id,
        _opts
      ) do
    with :ok <- credentials(config),
         {:ok, monitor} <-
           request(
             config,
             "/api/v1/monitor/#{Support.encode_path(monitor_id)}"
           ) do
      {:ok, normalize_monitor(monitor)}
    end
  end

  defp request(config, path, opts \\ []) do
    Req.new(
      base_url: api_base(config.site),
      headers: %{
        "accept" => "application/json",
        "dd-api-key" => config.api_key,
        "dd-application-key" => config.app_key
      }
    )
    |> then(&Support.request(__MODULE__, &1, :get, path, opts))
  end

  defp credentials(%{api_key: api_key, app_key: app_key})
       when is_binary(api_key) and byte_size(api_key) > 0 and is_binary(app_key) and
              byte_size(app_key) > 0,
       do: :ok

  defp credentials(_),
    do: {:error, "datadog access requires API and application keys"}

  defp api_base(site) do
    case String.trim(to_string(site || "")) do
      "" -> "https://api.datadoghq.com"
      site -> "https://api.#{site}"
    end
  end

  defp normalize_dashboard(dashboard) do
    Support.item(
      dashboard["id"],
      dashboard["title"],
      dashboard["description"],
      dashboard["url"],
      dashboard
    )
  end

  defp normalize_monitor(monitor) do
    Support.item(
      to_string(monitor["id"]),
      monitor["name"],
      monitor["message"] || monitor["query"],
      monitor["url"],
      monitor
    )
  end
end
