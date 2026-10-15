defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.Client do
  @moduledoc """
  Thin client over the ServiceNow [Table API](https://www.servicenow.com/docs/bundle/latest-api-reference/page/integrate/inbound-rest/concept/c_TableAPI.html)
  (`/api/now/table/{table}`), restricted to the ticket tables in `tables/0`.

  Authenticates with HTTP Basic (username/password) or, when the workbench tool has
  OAuth token exchange configured, a bearer token from `Console.AI.Provider.TokenExchange`.
  """

  alias Console.AI.Tools.Workbench.Integration.{Http, Query}
  alias Console.AI.Provider.TokenExchange
  alias Console.Schema.DeploymentSettings.OauthToken
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.Configuration.ServiceNowConnection

  @tables ~w(incident change_request problem sc_task)
  @sys_id ~r/\A[0-9a-f]{32}\z/i
  # record numbers are interpolated into an encoded query, so `^` and `=` must never get through
  @number ~r/\A[A-Za-z0-9_-]+\z/

  @type t :: %{
          base_url: String.t(),
          instance_url: String.t(),
          headers: [{String.t(), String.t()}],
          allow_delete: boolean
        }

  @doc "The ServiceNow tables the workbench tool is allowed to touch."
  @spec tables() :: [String.t()]
  def tables, do: @tables

  @spec build(WorkbenchTool.t()) :: {:ok, t} | {:error, String.t()}
  def build(%WorkbenchTool{
        tool: :service_now,
        oauth: %OauthToken{enabled: enabled} = oauth,
        configuration: %{service_now: %ServiceNowConnection{url: url} = conn}
      })
      when enabled != false and is_binary(url) do
    with {:ok, header} <- TokenExchange.authorization_header(oauth),
         do: {:ok, client(url, header, conn)}
  end

  def build(%WorkbenchTool{
        tool: :service_now,
        configuration: %{
          service_now: %ServiceNowConnection{url: url, username: user, password: pass} = conn
        }
      })
      when is_binary(url) and is_binary(user) and is_binary(pass) do
    {:ok, client(url, {"Authorization", "Basic #{Base.encode64("#{user}:#{pass}")}"}, conn)}
  end

  def build(%WorkbenchTool{}),
    do: {:error, "ServiceNow connection is not configured for this workbench tool."}

  defp client(url, auth, %ServiceNowConnection{allow_delete: allow_delete}) do
    instance = normalize_url(url)

    %{
      base_url: instance <> "/api/now",
      instance_url: instance,
      headers: [auth],
      allow_delete: allow_delete == true
    }
  end

  @doc """
  Builds a Table API path for an allowed table, optionally scoped to a record `sys_id`.
  """
  @spec table_path(String.t(), String.t() | nil) :: {:ok, String.t()} | {:error, String.t()}
  def table_path(table, sys_id \\ nil)
  def table_path(table, sys_id) when table in @tables and is_binary(sys_id) and byte_size(sys_id) > 0,
    do: {:ok, "/table/#{table}/#{segment(sys_id)}"}
  def table_path(table, _) when table in @tables, do: {:ok, "/table/#{table}"}
  def table_path(table, _),
    do: {:error, "ServiceNow table #{inspect(table)} is not supported, use one of: #{Enum.join(@tables, ", ")}."}

  @doc """
  Resolves a record reference to its `sys_id`. Accepts either a 32 character `sys_id`
  or a record number such as `INC0010001`, which is looked up in `table`.
  """
  @spec resolve_sys_id(t, String.t(), String.t()) :: {:ok, String.t()} | {:error, String.t()}
  def resolve_sys_id(client, table, id) when is_binary(id) do
    id = String.trim(id)

    case {Regex.match?(@sys_id, id), Regex.match?(@number, id)} do
      {true, _} -> {:ok, id}
      {_, true} -> lookup_number(client, table, id)
      _ -> {:error, "ServiceNow record id must be a sys_id or a record number, got #{inspect(id)}."}
    end
  end

  def resolve_sys_id(_, _, _), do: {:error, "ServiceNow record id is required."}

  defp lookup_number(client, table, number) do
    with {:ok, path} <- table_path(table),
         {:ok, %{"result" => [%{"sys_id" => sys_id} | _]}} when is_binary(sys_id) <-
           get(client, path, %{sysparm_query: "number=#{number}", sysparm_fields: "sys_id", sysparm_limit: 1}) do
      {:ok, sys_id}
    else
      {:ok, _} -> {:error, "ServiceNow #{table} record #{number} was not found."}
      error -> error
    end
  end

  @spec get(t, String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def get(client, path, query \\ %{}), do: request(client, :get, path, query: query)

  @spec post(t, String.t(), map(), map()) :: {:ok, term()} | {:error, String.t()}
  def post(client, path, body, query \\ %{}), do: request(client, :post, path, json: body, query: query)

  @spec patch(t, String.t(), map(), map()) :: {:ok, term()} | {:error, String.t()}
  def patch(client, path, body, query \\ %{}), do: request(client, :patch, path, json: body, query: query)

  @spec delete(t, String.t()) :: {:ok, term()} | {:error, String.t()}
  def delete(client, path), do: request(client, :delete, path, [])

  @doc """
  Parses an offset cursor, where a missing or blank cursor means the first page.
  """
  @spec parse_cursor(String.t() | nil) :: {:ok, non_neg_integer()} | {:error, String.t()}
  def parse_cursor(value) when is_binary(value) and byte_size(value) > 0 do
    case Integer.parse(value) do
      {offset, ""} when offset >= 0 -> {:ok, offset}
      _ -> {:error, "ServiceNow cursor must be a non-negative integer offset."}
    end
  end
  def parse_cursor(_), do: {:ok, 0}

  @doc """
  Adds a `nextCursor` offset to a Table API list response. It is `nil` when the page
  came back short, meaning there is nothing further to read.
  """
  @spec put_next_cursor(map(), non_neg_integer(), pos_integer()) :: map()
  def put_next_cursor(%{} = response, offset, limit) do
    count = response["result"] |> List.wrap() |> length()
    next_cursor = if count >= limit, do: Integer.to_string(offset + count)

    Map.put(response, "nextCursor", next_cursor)
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
    |> Http.handle("ServiceNow")
  end

  defp normalize_url(url) do
    url
    |> String.trim()
    |> String.trim_trailing("/")
    |> String.replace(~r{/api/now(/.*)?\z}i, "")
  end

  defp http_opts,
    do: Console.Utils.HTTP.client_options(:httpoison_service_now_options, :req_service_now_options)
end
