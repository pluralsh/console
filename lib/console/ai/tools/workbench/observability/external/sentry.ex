defmodule Console.AI.Tools.Workbench.Observability.External.Sentry do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.External.Support
  alias Console.Schema.WorkbenchTool

  def list_dashboards(
        %WorkbenchTool{configuration: %{sentry: %{} = config}},
        opts
      ) do
    with {:ok, organization} <- scope(opts),
         {:ok, response} <-
           request_page(
             config,
             "/organizations/#{Support.encode_path(organization)}/dashboards/",
             params:
               Support.params(%{
                 "per_page" => opts[:limit],
                 "cursor" => opts[:cursor],
                 "query" => opts[:q]
               })
           ) do
      dashboards = Enum.map(response.body, &normalize_dashboard/1)
      {:ok, Support.page(:dashboards, dashboards, opts, next_cursor: Support.link_next_cursor(response))}
    end
  end

  def get_dashboard(
        %WorkbenchTool{configuration: %{sentry: %{} = config}},
        dashboard_id,
        opts
      ) do
    with {:ok, organization} <- scope(opts),
         {:ok, dashboard} <-
           request(
             config,
             "/organizations/#{Support.encode_path(organization)}/dashboards/#{Support.encode_path(dashboard_id)}/"
           ) do
      {:ok, normalize_dashboard(dashboard)}
    end
  end

  def list_monitors(
        %WorkbenchTool{configuration: %{sentry: %{} = config}},
        opts
      ) do
    with {:ok, organization} <- scope(opts),
         {:ok, response} <-
           request_page(
             config,
             "/organizations/#{Support.encode_path(organization)}/alert-rules/",
             params:
               Support.params(%{
                 "per_page" => opts[:limit],
                 "cursor" => opts[:cursor],
                 "query" => opts[:q]
               })
           ) do
      monitors = Enum.map(response.body, &normalize_monitor/1)
      {:ok, Support.page(:monitors, monitors, opts, next_cursor: Support.link_next_cursor(response))}
    end
  end

  def get_monitor(
        %WorkbenchTool{configuration: %{sentry: %{} = config}},
        monitor_id,
        opts
      ) do
    with {:ok, organization} <- scope(opts),
         {:ok, monitor} <-
           request(
             config,
             "/organizations/#{Support.encode_path(organization)}/alert-rules/#{Support.encode_path(monitor_id)}/"
           ) do
      {:ok, normalize_monitor(monitor)}
    end
  end

  defp scope(opts) do
    case String.trim(to_string(opts[:scope] || "")) do
      "" -> {:error, "sentry access requires an organization slug in scope"}
      scope -> {:ok, scope}
    end
  end

  defp request(%{access_token: token} = config, path)
       when is_binary(token) and byte_size(token) > 0 do
    Req.new(
      base_url: api_base(config.url),
      auth: {:bearer, token},
      headers: %{"accept" => "application/json"}
    )
    |> then(&Support.request(__MODULE__, &1, :get, path))
  end

  defp request(_, _), do: {:error, "sentry access requires an access token"}

  defp request_page(%{access_token: token} = config, path, opts)
       when is_binary(token) and byte_size(token) > 0 do
    Req.new(
      base_url: api_base(config.url),
      auth: {:bearer, token},
      headers: %{"accept" => "application/json"}
    )
    |> then(&Support.request_response(__MODULE__, &1, :get, path, opts))
  end

  defp request_page(_, _, _),
    do: {:error, "sentry access requires an access token"}

  defp api_base(url) do
    url
    |> to_string()
    |> String.trim()
    |> case do
      "" -> "https://sentry.io"
      url -> url
    end
    |> String.trim_trailing("/")
    |> String.replace(~r"/mcp(/.*)?$", "")
    |> then(fn
      "https://mcp.sentry.dev" -> "https://sentry.io"
      "http://mcp.sentry.dev" -> "https://sentry.io"
      url -> url
    end)
    |> Kernel.<>("/api/0")
  end

  defp normalize_dashboard(dashboard) do
    Support.item(
      to_string(dashboard["id"]),
      dashboard["title"],
      dashboard["description"],
      nil,
      dashboard
    )
  end

  defp normalize_monitor(monitor) do
    Support.item(
      to_string(monitor["id"]),
      monitor["name"],
      monitor["query"],
      nil,
      monitor
    )
  end
end
