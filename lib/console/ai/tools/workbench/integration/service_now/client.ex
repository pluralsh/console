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

  @tables ~w(incident change_request problem sc_task sc_request sc_req_item)
  # requests and requested items come from ordering a catalog item, a Table API insert would
  # skip the catalog flow and leave them without a parent request or variables
  @creatable ~w(incident change_request problem sc_task)
  @sys_id ~r/\A[0-9a-f]{32}\z/i
  # record numbers are interpolated into an encoded query, so `^` and `=` must never get through
  @number ~r/\A[A-Za-z0-9_-]+\z/
  # column names are interpolated into an encoded query as well
  @field ~r/\A[a-z][a-z0-9_]*\z/

  @type t :: %{
          base_url: String.t(),
          change_url: String.t(),
          instance_url: String.t(),
          headers: [{String.t(), String.t()}]
        }

  @doc "The ServiceNow tables the workbench tool is allowed to touch."
  @spec tables() :: [String.t()]
  def tables, do: @tables

  @doc "The subset of `tables/0` the workbench tool may create records in."
  @spec creatable_tables() :: [String.t()]
  def creatable_tables, do: @creatable

  @spec build(WorkbenchTool.t()) :: {:ok, t} | {:error, String.t()}
  def build(%WorkbenchTool{
        tool: :service_now,
        oauth: %OauthToken{enabled: enabled} = oauth,
        configuration: %{service_now: %ServiceNowConnection{url: url}}
      })
      when enabled != false and is_binary(url) do
    with {:ok, header} <- TokenExchange.authorization_header(oauth),
         do: {:ok, client(url, header)}
  end

  def build(%WorkbenchTool{
        tool: :service_now,
        configuration: %{
          service_now: %ServiceNowConnection{url: url, username: user, password: pass}
        }
      })
      when is_binary(url) and is_binary(user) and is_binary(pass) do
    {:ok, client(url, {"Authorization", "Basic #{Base.encode64("#{user}:#{pass}")}"})}
  end

  def build(%WorkbenchTool{}),
    do: {:error, "ServiceNow connection is not configured for this workbench tool."}

  defp client(url, auth) do
    instance = normalize_url(url)

    %{
      base_url: instance <> "/api/now",
      change_url: instance <> "/api/sn_chg_rest/v1",
      instance_url: instance,
      headers: [auth]
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

  @doc """
  Change Management API (`/api/sn_chg_rest/v1`) variants of `get/3` and `patch/4`, used to
  read the next states of a change and to move it.
  """
  @spec change_get(t, String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def change_get(client, path, query \\ %{}), do: request(client, :get, path, query: query, api: :change)

  @spec change_patch(t, String.t(), map(), map()) :: {:ok, term()} | {:error, String.t()}
  def change_patch(client, path, body, query \\ %{}),
    do: request(client, :patch, path, json: body, query: query, api: :change)

  @doc """
  Lists the choices of the `state` field for a ticket table as `%{"value" => ..., "label" => ...}`.
  Choices are stored per language, so only English rows are read. Tables that inherit their
  states from `task` (catalog tasks, sometimes problems) have none of their own, in which case
  the `task` choices are used.
  """
  @spec state_choices(t, String.t()) :: {:ok, [map()]} | {:error, String.t()}
  def state_choices(client, table), do: field_choices(client, table, "state")

  @doc """
  Lists the choices of any choice field of a ticket table, for example the resolution code
  `close_code`. Values differ per instance, so they have to be read, not guessed. A table without
  choices of its own uses the ones of `task`, as ServiceNow does. The field name is interpolated
  into an encoded query, so only plain column names are accepted.
  """
  @spec field_choices(t, String.t(), String.t()) :: {:ok, [map()]} | {:error, String.t()}
  def field_choices(client, table, field) when is_binary(field) do
    case Regex.match?(@field, field) do
      true ->
        with {:ok, []} <- choices(client, table, field),
             do: choices(client, "task", field)
      false ->
        {:error, "ServiceNow field must be a plain column name, got #{inspect(field)}."}
    end
  end
  def field_choices(_, _, field), do: {:error, "ServiceNow field must be a plain column name, got #{inspect(field)}."}

  defp choices(client, name, field) do
    query = %{
      sysparm_query: "name=#{name}^element=#{field}^inactive=false^language=en^ORDERBYsequence",
      sysparm_fields: "value,label,sequence",
      sysparm_limit: 100
    }

    with {:ok, %{"result" => rows}} when is_list(rows) <- get(client, "/table/sys_choice", query) do
      {:ok,
       rows
       |> Enum.map(&Map.take(&1, ~w(value label)))
       |> Enum.filter(&is_binary(&1["value"]))
       |> Enum.uniq_by(& &1["value"])}
    else
      {:ok, _} -> {:ok, []}
      error -> error
    end
  end

  @doc """
  Matches a state given as a raw value (`"2"`) or a label (`"In Progress"`) against a list
  of choices and returns the raw value.
  """
  @spec match_state([map()], term()) :: {:ok, String.t()} | :error
  def match_state(choices, state) do
    wanted = state |> to_string() |> String.trim() |> String.downcase()

    case Enum.find(choices, &(String.downcase(&1["value"]) == wanted or String.downcase(to_string(&1["label"])) == wanted)) do
      %{"value" => value} -> {:ok, value}
      _ -> :error
    end
  end

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

  defp request(%{headers: auth_headers} = client, method, path, opts) do
    query = Keyword.get(opts, :query, %{})
    base = if opts[:api] == :change, do: client.change_url, else: client.base_url
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
