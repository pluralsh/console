defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboards.Splunk do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.Support
  alias Console.Schema.WorkbenchTool

  def list(%WorkbenchTool{configuration: %{splunk: %{} = config}}, opts) do
    with {:ok, offset} <- Support.offset_cursor(opts[:cursor]),
         {:ok, %{"entry" => entries} = result} <-
           request(config, "/servicesNS/-/-/data/ui/views",
             params:
               %{
                 "output_mode" => "json",
                 "count" => opts[:limit],
                 "offset" => offset,
                 "search" => search(opts[:q])
               }
               |> Enum.reject(fn {_, value} -> is_nil(value) end)
               |> Map.new()
           ) do
      dashboards = Enum.map(entries, &normalize/1)
      total = get_in(result, ["paging", "total"])
      next_cursor = next_cursor(offset, length(dashboards), total)
      {:ok, Support.page(dashboards, opts, total: total, next_cursor: next_cursor)}
    end
  end

  def get(
        %WorkbenchTool{configuration: %{splunk: %{} = config}},
        dashboard_id,
        _opts
      ) do
    with {:ok, %{"entry" => [entry | _]}} <-
           request(
             config,
             "/servicesNS/-/-/data/ui/views/#{Support.encode_path(dashboard_id)}",
             params: %{"output_mode" => "json"}
           ) do
      {:ok, normalize(entry)}
    else
      {:ok, %{"entry" => []}} -> {:error, "splunk dashboard not found"}
      error -> error
    end
  end

  defp request(%{url: url} = config, path, opts)
       when is_binary(url) and byte_size(url) > 0 do
    case auth(config) do
      {:ok, auth_headers, auth_opts} ->
        Req.new(
          [
            base_url: String.trim_trailing(url, "/"),
            headers: Map.merge(%{"accept" => "application/json"}, auth_headers)
          ] ++ auth_opts
        )
        |> then(&Support.request(__MODULE__, &1, :get, path, opts))

      error ->
        error
    end
  end

  defp request(_, _, _),
    do: {:error, "splunk dashboard access requires a URL and credentials"}

  defp auth(%{token: token}) when is_binary(token) and byte_size(token) > 0,
    do: {:ok, %{"authorization" => "Bearer #{token}"}, []}

  defp auth(%{username: username, password: password})
       when is_binary(username) and byte_size(username) > 0 and is_binary(password) and
              byte_size(password) > 0,
       do: {:ok, %{}, [auth: {:basic, "#{username}:#{password}"}]}

  defp auth(_), do: {:error, "splunk dashboard access requires a token or username and password"}

  defp search(q) when is_binary(q) and byte_size(q) > 0,
    do: ~s(name="*#{escape_search(q)}*" OR label="*#{escape_search(q)}*")

  defp search(_), do: nil

  defp escape_search(value) do
    value
    |> String.replace("\\", "\\\\")
    |> String.replace("\"", "\\\"")
    |> String.replace("*", "\\*")
  end

  defp next_cursor(offset, count, total)
       when is_integer(total) and offset + count < total,
       do: Integer.to_string(offset + count)

  defp next_cursor(_, _, _), do: nil

  defp normalize(entry) do
    content = entry["content"] || %{}

    Support.dashboard(
      entry["name"],
      content["label"] || entry["name"],
      content["description"],
      entry["links"] && entry["links"]["alternate"],
      entry
    )
  end
end
