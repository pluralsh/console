defmodule Console.AI.Tools.Workbench.Observability.ExternalDashboards.Azure do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Observability.ExternalDashboards.Support
  alias Console.Schema.WorkbenchTool

  @api_version "2020-09-01-preview"

  def list(%WorkbenchTool{configuration: %{azure: %{} = config}}, opts) do
    with :ok <- Support.unsupported_search(opts, "azure"),
         {:ok, token} <- token(config),
         {:ok, path, params} <- page_request(config, opts[:cursor]),
         {:ok, %{"value" => dashboards} = result} <- request(token, path, params) do
      dashboards = Enum.map(dashboards, &normalize/1)
      {:ok, Support.page(dashboards, opts, next_cursor: result["nextLink"])}
    end
  end

  def get(
        %WorkbenchTool{configuration: %{azure: %{} = config}},
        dashboard_id,
        _opts
      ) do
    with {:ok, token} <- token(config),
         {:ok, dashboard} <-
           request(token, dashboard_path(dashboard_id, config.subscription_id),
             params: %{"api-version" => @api_version}
           ) do
      {:ok, normalize(dashboard)}
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

  defp token(_), do: {:error, "azure dashboard access requires tenant, client, and secret"}

  defp request(token, path, opts) do
    Req.new(
      base_url: "https://management.azure.com",
      auth: {:bearer, token},
      headers: %{"accept" => "application/json"}
    )
    |> then(&Support.request(__MODULE__, &1, :get, path, opts))
  end

  defp dashboard_path("/subscriptions/" <> _ = id, _), do: id

  defp dashboard_path(id, subscription_id),
    do:
      "/subscriptions/#{Support.encode_path(subscription_id)}/providers/Microsoft.Portal/dashboards/#{Support.encode_path(id)}"

  defp page_request(config, cursor) when cursor in [nil, ""] do
    {:ok,
     "/subscriptions/#{Support.encode_path(config.subscription_id)}/providers/Microsoft.Portal/dashboards",
     [params: %{"api-version" => @api_version}]}
  end

  defp page_request(_, cursor) do
    case URI.parse(cursor) do
      %URI{scheme: "https", host: "management.azure.com", path: path, query: query} ->
        {:ok, path <> if(query, do: "?#{query}", else: ""), []}

      _ ->
        {:error, "invalid azure dashboard pagination cursor"}
    end
  end

  defp normalize(dashboard) do
    Support.dashboard(
      dashboard["id"],
      dashboard["name"],
      get_in(dashboard, ["tags", "description"]),
      nil,
      dashboard
    )
  end
end
