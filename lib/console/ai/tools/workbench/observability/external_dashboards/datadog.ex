defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboards.Datadog do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.Support
  alias Console.Schema.WorkbenchTool

  def list(
        %WorkbenchTool{configuration: %{datadog: %{} = config}},
        opts
      ) do
    with :ok <- credentials(config),
         :ok <- Support.unsupported_search(opts, "datadog"),
         {:ok, offset} <- Support.offset_cursor(opts[:cursor]),
         {:ok, %{"dashboards" => dashboards} = result} <-
           request(config, "/api/v1/dashboard",
             params: %{"count" => opts[:limit], "start" => offset}
           ) do
      dashboards = Enum.map(dashboards, &normalize/1)
      total = result["total"]
      next_cursor = next_cursor(offset, length(dashboards), total)
      {:ok, Support.page(dashboards, opts, total: total, next_cursor: next_cursor)}
    end
  end

  def get(
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
      {:ok, normalize(dashboard)}
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
    do: {:error, "datadog dashboard access requires API and application keys"}

  defp api_base(site) do
    case String.trim(to_string(site || "")) do
      "" -> "https://api.datadoghq.com"
      site -> "https://api.#{site}"
    end
  end

  defp next_cursor(offset, count, total)
       when is_integer(total) and offset + count < total,
       do: Integer.to_string(offset + count)

  defp next_cursor(_, _, _), do: nil

  defp normalize(dashboard) do
    Support.dashboard(
      dashboard["id"],
      dashboard["title"],
      dashboard["description"],
      dashboard["url"],
      dashboard
    )
  end
end
