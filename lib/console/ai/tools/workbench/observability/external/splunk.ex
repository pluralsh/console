defmodule Console.AI.Tools.Workbench.Observability.External.Splunk do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.External.Support
  alias Console.Schema.WorkbenchTool

  def list_dashboards(%WorkbenchTool{configuration: %{splunk: %{} = config}}, opts) do
    with {:ok, offset} <- Support.offset_cursor(opts[:cursor]),
         {:ok, %{"entry" => entries} = result} <-
           request(config, "/servicesNS/-/-/data/ui/views",
             params:
               Support.params(%{
                 "output_mode" => "json",
                 "count" => opts[:limit],
                 "offset" => offset,
                 "search" => dashboard_search(opts[:q])
               })
           ) do
      dashboards = Enum.map(entries, &normalize_dashboard/1)
      total = get_in(result, ["paging", "total"])
      next_cursor = Support.next_offset_cursor(offset, length(dashboards), total)
      {:ok, Support.page(:dashboards, dashboards, opts, total: total, next_cursor: next_cursor)}
    end
  end

  def get_dashboard(
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
      {:ok, normalize_dashboard(entry)}
    else
      {:ok, %{"entry" => []}} -> {:error, "splunk dashboard not found"}
      error -> error
    end
  end

  def list_monitors(%WorkbenchTool{configuration: %{splunk: %{} = config}}, opts) do
    with {:ok, offset} <- Support.offset_cursor(opts[:cursor]),
         {:ok, %{"entry" => entries} = result} <-
           request(config, "/servicesNS/-/-/saved/searches",
             params:
               Support.params(%{
                 "output_mode" => "json",
                 "count" => opts[:limit],
                 "offset" => offset,
                 "search" => alert_search(opts[:q])
               })
           ) do
      monitors = Enum.map(entries, &normalize_monitor/1)
      total = get_in(result, ["paging", "total"])
      next_cursor = Support.next_offset_cursor(offset, length(monitors), total)
      {:ok, Support.page(:monitors, monitors, opts, total: total, next_cursor: next_cursor)}
    end
  end

  def get_monitor(
        %WorkbenchTool{configuration: %{splunk: %{} = config}},
        monitor_id,
        _opts
      ) do
    with {:ok, %{"entry" => [entry | _]}} <-
           request(
             config,
             "/servicesNS/-/-/saved/searches/#{Support.encode_path(monitor_id)}",
             params: %{"output_mode" => "json"}
           ) do
      {:ok, normalize_monitor(entry)}
    else
      {:ok, %{"entry" => []}} -> {:error, "splunk alert not found"}
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
    do: {:error, "splunk access requires a URL and credentials"}

  defp auth(%{token: token}) when is_binary(token) and byte_size(token) > 0,
    do: {:ok, %{"authorization" => "Bearer #{token}"}, []}

  defp auth(%{username: username, password: password})
       when is_binary(username) and byte_size(username) > 0 and is_binary(password) and
              byte_size(password) > 0,
       do: {:ok, %{}, [auth: {:basic, "#{username}:#{password}"}]}

  defp auth(_), do: {:error, "splunk access requires a token or username and password"}

  defp dashboard_search(q) when is_binary(q) and byte_size(q) > 0,
    do: ~s(name="*#{escape_search(q)}*" OR label="*#{escape_search(q)}*")

  defp dashboard_search(_), do: nil

  defp alert_search(q) when is_binary(q) and byte_size(q) > 0 do
    escaped = escape_search(q)
    "alert.track=1 AND (name=\"*#{escaped}*\" OR title=\"*#{escaped}*\")"
  end

  defp alert_search(_), do: "alert.track=1"

  defp escape_search(value) do
    value
    |> String.replace("\\", "\\\\")
    |> String.replace("\"", "\\\"")
    |> String.replace("*", "\\*")
  end

  defp normalize_dashboard(entry) do
    content = entry["content"] || %{}

    Support.item(
      entry["name"],
      content["label"] || entry["name"],
      content["description"],
      entry["links"] && entry["links"]["alternate"],
      entry
    )
  end

  defp normalize_monitor(entry) do
    content = entry["content"] || %{}

    Support.item(
      entry["name"],
      content["label"] || entry["name"],
      content["description"],
      entry["links"] && entry["links"]["alternate"],
      entry
    )
  end
end
