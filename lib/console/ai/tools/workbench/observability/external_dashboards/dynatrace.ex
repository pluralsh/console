defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboards.Dynatrace do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.Support
  alias Console.Schema.WorkbenchTool

  def list(%WorkbenchTool{configuration: %{dynatrace: %{} = config}}, opts) do
    with {:ok, %{"documents" => documents} = result} <-
           request(config, "/platform/document/v1/documents",
             params:
               %{
                 "filter" => filter(opts[:q]),
                 "page-size" => opts[:limit],
                 "page-key" => opts[:cursor]
               }
               |> Enum.reject(fn {_, value} -> is_nil(value) end)
               |> Map.new()
           ) do
      dashboards = Enum.map(documents, &normalize/1)
      {:ok, Support.page(dashboards, opts, next_cursor: result["nextPageKey"])}
    end
  end

  def get(
        %WorkbenchTool{configuration: %{dynatrace: %{} = config}},
        dashboard_id,
        _opts
      ) do
    with {:ok, dashboard} <-
           request(
             config,
             "/platform/document/v1/documents/#{Support.encode_path(dashboard_id)}"
           ) do
      {:ok, normalize(dashboard)}
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
    do: {:error, "dynatrace dashboard access requires a URL and platform token"}

  defp filter(q) when is_binary(q) and byte_size(q) > 0,
    do: "type = 'dashboard' and name contains '#{escape_filter(q)}'"

  defp filter(_), do: "type = 'dashboard'"

  defp escape_filter(value) do
    value
    |> String.replace("\\", "\\\\")
    |> String.replace("'", "\\'")
  end

  defp normalize(document) do
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

    Support.dashboard(
      document["id"],
      document["name"] || content["name"],
      document["description"] || content["description"],
      nil,
      content
    )
  end
end
