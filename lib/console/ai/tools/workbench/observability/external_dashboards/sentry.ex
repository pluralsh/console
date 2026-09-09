defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboards.Sentry do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.Support
  alias Console.Schema.WorkbenchTool

  def list(
        %WorkbenchTool{configuration: %{sentry: %{} = config}},
        opts
      ) do
    with {:ok, organization} <- scope(opts),
         {:ok, response} <-
           request_page(
             config,
             "/organizations/#{Support.encode_path(organization)}/dashboards/",
             params:
               %{
                 "per_page" => opts[:limit],
                 "cursor" => opts[:cursor],
                 "query" => opts[:q]
               }
               |> Enum.reject(fn {_, value} -> is_nil(value) end)
               |> Map.new()
           ) do
      dashboards = Enum.map(response.body, &normalize/1)
      {:ok, Support.page(dashboards, opts, next_cursor: next_cursor(response))}
    end
  end

  def get(
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
      {:ok, normalize(dashboard)}
    end
  end

  defp scope(opts) do
    case String.trim(to_string(opts[:scope] || "")) do
      "" -> {:error, "sentry dashboard access requires an organization slug in scope"}
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

  defp request(_, _), do: {:error, "sentry dashboard access requires an access token"}

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
    do: {:error, "sentry dashboard access requires an access token"}

  defp next_cursor(response) do
    with [link | _] <- Req.Response.get_header(response, "link"),
         [_, url] <- Regex.run(~r/<([^>]+)>;\s*rel="next"/, link),
         %URI{query: query} when is_binary(query) <- URI.parse(url) do
      query
      |> URI.decode_query()
      |> Map.get("cursor")
    else
      _ -> nil
    end
  end

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

  defp normalize(dashboard) do
    Support.dashboard(
      to_string(dashboard["id"]),
      dashboard["title"],
      dashboard["description"],
      nil,
      dashboard
    )
  end
end
