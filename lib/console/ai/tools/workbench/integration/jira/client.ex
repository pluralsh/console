defmodule Console.AI.Tools.Workbench.Integration.Jira.Client do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Integration.{Http, Query}
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.Configuration.{
    JiraConnection,
    JiraDatacenterConnection
  }

  @type deployment :: :cloud | :datacenter
  @type t :: %{base_url: String.t(), headers: [{String.t(), String.t()}], deployment: deployment}

  @spec build(WorkbenchTool.t()) :: {:ok, t} | {:error, String.t()}
  def build(%WorkbenchTool{
        tool: :jira,
        configuration: %{jira: %JiraConnection{url: url, email: email, api_token: token}}
      })
      when is_binary(url) and is_binary(email) and is_binary(token) do
    auth = Base.encode64("#{email}:#{token}")

    {:ok,
     %{
       base_url: api_root(url, :cloud),
       headers: [{"Authorization", "Basic #{auth}"}],
       deployment: :cloud
     }}
  end

  def build(%WorkbenchTool{
        tool: :jira_datacenter,
        configuration: %{
          jira_datacenter: %JiraDatacenterConnection{url: url, api_token: token}
        }
      })
      when is_binary(url) and is_binary(token) do
    {:ok,
     %{
       base_url: api_root(url, :datacenter),
       headers: [{"Authorization", "Bearer #{token}"}],
       deployment: :datacenter
     }}
  end

  def build(%WorkbenchTool{}),
    do: {:error, "Jira connection is not configured for this workbench tool."}

  @doc false
  def api_root(url, :cloud), do: normalize_url(url) <> "/rest/api/2"
  def api_root(url, :datacenter), do: normalize_url(url) <> "/rest/api/2"

  @spec get(t, String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def get(client, path, query \\ %{}), do: request(client, :get, path, query: query)

  @spec post(t, String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def post(client, path, body), do: request(client, :post, path, json: body)

  @spec put(t, String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def put(client, path, body), do: request(client, :put, path, json: body)

  @spec search(t, map()) :: {:ok, term()} | {:error, String.t()}
  def search(%{deployment: :cloud} = client, params) do
    params
    |> Map.delete(:startAt)
    |> then(&get(client, "/search/jql", &1))
  end

  def search(%{deployment: :datacenter} = client, params) do
    params
    |> Map.delete(:nextPageToken)
    |> then(&get(client, "/search", &1))
  end

  @doc false
  def segment(value), do: value |> to_string() |> URI.encode_www_form()

  defp request(%{base_url: base, headers: auth_headers}, method, path, opts) do
    query = Keyword.get(opts, :query, %{})
    url = base <> path <> Query.query_string(query)

    request_opts = [
      method: method,
      url: url,
      headers: auth_headers ++ [{"Accept", "application/json"}]
    ]

    case Keyword.fetch(opts, :json) do
      {:ok, body} ->
        request_opts
        |> Keyword.put(
          :headers,
          request_opts[:headers] ++ [{"Content-Type", "application/json"}]
        )
        |> Keyword.put(:body, Jason.encode!(body))

      :error ->
        request_opts
    end
    |> Enum.concat(http_opts())
    |> Req.request()
    |> Http.handle("Jira")
  end

  defp normalize_url(url) do
    url
    |> String.trim()
    |> String.trim_trailing("/")
    |> String.replace(~r{/rest/api/(latest|[0-9]+)\z}i, "")
  end

  defp http_opts,
    do: Console.Utils.HTTP.client_options(:httpoison_jira_options, :req_jira_options)
end
