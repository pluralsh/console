defmodule Console.AI.Tools.Workbench.Observability.External.Azure do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.External.Support
  alias Console.Schema.WorkbenchTool

  @dashboard_api_version "2020-09-01-preview"
  @metric_alerts_api_version "2018-03-01"
  @scheduled_query_rules_api_version "2021-08-01"

  def list_dashboards(%WorkbenchTool{configuration: %{azure: %{} = config}}, opts) do
    with :ok <- Support.unsupported_search(opts, "azure", "dashboard"),
         {:ok, token} <- token(config),
         {:ok, path, params} <- dashboard_page_request(config, opts[:cursor]),
         {:ok, %{"value" => dashboards} = result} <- request(token, path, params) do
      dashboards = Enum.map(dashboards, &normalize_dashboard/1)
      {:ok, Support.page(:dashboards, dashboards, opts, next_cursor: result["nextLink"])}
    end
  end

  def get_dashboard(
        %WorkbenchTool{configuration: %{azure: %{} = config}},
        dashboard_id,
        _opts
      ) do
    with {:ok, token} <- token(config),
         {:ok, dashboard} <-
           request(token, dashboard_path(dashboard_id, config.subscription_id),
             params: %{"api-version" => @dashboard_api_version}
           ) do
      {:ok, normalize_dashboard(dashboard)}
    end
  end

  def list_monitors(%WorkbenchTool{configuration: %{azure: %{} = config}}, opts) do
    with :ok <- Support.unsupported_search(opts, "azure", "monitor"),
         {:ok, token} <- token(config),
         {:ok, monitors, next_cursor} <- list_monitor_page(token, config, opts) do
      {:ok, Support.page(:monitors, monitors, opts, next_cursor: next_cursor)}
    end
  end

  def get_monitor(
        %WorkbenchTool{configuration: %{azure: %{} = config}},
        monitor_id,
        _opts
      ) do
    with {:ok, token} <- token(config),
         {:ok, monitor} <-
           request(token, monitor_path(monitor_id, config.subscription_id),
             params: %{"api-version" => monitor_api_version(monitor_id)}
           ) do
      {:ok, normalize_monitor(monitor)}
    end
  end

  defp token(%{
         tenant_id: tenant_id,
         client_id: client_id,
         client_secret: client_secret
       })
       when is_binary(tenant_id) and byte_size(tenant_id) > 0 and is_binary(client_id) and
              byte_size(client_id) > 0 and is_binary(client_secret) and
              byte_size(client_secret) > 0 do
    Req.new(base_url: "https://login.microsoftonline.com")
    |> then(
      &Support.request(
        __MODULE__,
        &1,
        :post,
        "/#{Support.encode_path(tenant_id)}/oauth2/v2.0/token",
        form: %{
          "client_id" => client_id,
          "client_secret" => client_secret,
          "grant_type" => "client_credentials",
          "scope" => "https://management.azure.com/.default"
        }
      )
    )
    |> case do
      {:ok, %{"access_token" => token}} -> {:ok, token}
      {:ok, _} -> {:error, "azure token response did not include an access token"}
      error -> error
    end
  end

  defp token(_), do: {:error, "azure access requires tenant, client, and secret"}

  defp request(token, path, opts) do
    Req.new(
      base_url: "https://management.azure.com",
      auth: {:bearer, token},
      headers: %{"accept" => "application/json"}
    )
    |> then(&Support.request(__MODULE__, &1, :get, path, opts))
  end

  defp list_monitor_page(token, config, opts) do
    with {:ok, collection, path, req_opts} <- monitor_page_request(config, opts[:cursor]),
         {:ok, %{"value" => items} = result} <- request(token, path, req_opts) do
      monitors = Enum.map(items, &normalize_monitor/1)
      next_link = result["nextLink"]

      cond do
        collection == :metric_alerts and is_nil(next_link) and monitors == [] and
            opts[:cursor] in [nil, ""] ->
          list_monitor_page(token, config, Keyword.put(opts, :cursor, "scheduledQueryRules"))

        collection == :metric_alerts and is_nil(next_link) ->
          {:ok, monitors, "scheduledQueryRules"}

        true ->
          {:ok, monitors, encode_monitor_cursor(collection, next_link)}
      end
    end
  end

  defp dashboard_path("/subscriptions/" <> _ = id, _), do: id

  defp dashboard_path(id, subscription_id),
    do:
      "/subscriptions/#{Support.encode_path(subscription_id)}/providers/Microsoft.Portal/dashboards/#{Support.encode_path(id)}"

  defp monitor_path("/subscriptions/" <> _ = id, _), do: id

  defp monitor_path(id, subscription_id),
    do:
      "/subscriptions/#{Support.encode_path(subscription_id)}/providers/Microsoft.Insights/metricAlerts/#{Support.encode_path(id)}"

  defp monitor_api_version(id) do
    if String.contains?(String.downcase(to_string(id)), "scheduledqueryrules") do
      @scheduled_query_rules_api_version
    else
      @metric_alerts_api_version
    end
  end

  defp dashboard_page_request(config, cursor) when cursor in [nil, ""] do
    {:ok,
     "/subscriptions/#{Support.encode_path(config.subscription_id)}/providers/Microsoft.Portal/dashboards",
     [params: %{"api-version" => @dashboard_api_version}]}
  end

  defp dashboard_page_request(_, cursor), do: azure_next_link(cursor, "dashboard")

  defp monitor_page_request(config, cursor) when cursor in [nil, ""] do
    {:ok, :metric_alerts, metric_alerts_path(config),
     [params: %{"api-version" => @metric_alerts_api_version}]}
  end

  defp monitor_page_request(config, "scheduledQueryRules") do
    {:ok, :scheduled_query_rules, scheduled_query_rules_path(config),
     [params: %{"api-version" => @scheduled_query_rules_api_version}]}
  end

  defp monitor_page_request(_, "metricAlerts|" <> cursor) do
    with {:ok, path, opts} <- azure_next_link(cursor, "monitor") do
      {:ok, :metric_alerts, path, opts}
    end
  end

  defp monitor_page_request(_, "scheduledQueryRules|" <> cursor) do
    with {:ok, path, opts} <- azure_next_link(cursor, "monitor") do
      {:ok, :scheduled_query_rules, path, opts}
    end
  end

  defp monitor_page_request(_, _),
    do: {:error, "invalid azure monitor pagination cursor"}

  defp metric_alerts_path(config),
    do:
      "/subscriptions/#{Support.encode_path(config.subscription_id)}/providers/Microsoft.Insights/metricAlerts"

  defp scheduled_query_rules_path(config),
    do:
      "/subscriptions/#{Support.encode_path(config.subscription_id)}/providers/Microsoft.Insights/scheduledQueryRules"

  defp encode_monitor_cursor(_collection, nil), do: nil

  defp encode_monitor_cursor(:metric_alerts, next_link),
    do: "metricAlerts|#{next_link}"

  defp encode_monitor_cursor(:scheduled_query_rules, next_link),
    do: "scheduledQueryRules|#{next_link}"

  defp azure_next_link(cursor, resource) do
    case URI.parse(cursor) do
      %URI{scheme: "https", host: "management.azure.com", path: path, query: query} ->
        {:ok, path <> if(query, do: "?#{query}", else: ""), []}

      _ ->
        {:error, "invalid azure #{resource} pagination cursor"}
    end
  end

  defp normalize_dashboard(dashboard) do
    Support.item(
      dashboard["id"],
      dashboard["name"],
      get_in(dashboard, ["tags", "description"]),
      nil,
      dashboard
    )
  end

  defp normalize_monitor(monitor) do
    Support.item(
      monitor["id"],
      monitor["name"],
      get_in(monitor, ["properties", "description"]),
      nil,
      monitor
    )
  end
end
