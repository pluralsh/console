defmodule Console.AI.Tools.Workbench.Integration.Gitlab.Client do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Integration.{Http, Query}
  alias Console.Schema.{ScmConnection, WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GitlabConnection}

  @default_api_root "https://gitlab.com/api/v4"

  @spec build(WorkbenchTool.t()) :: {:ok, map()} | {:error, String.t()}
  def build(%WorkbenchTool{scm_connection: %ScmConnection{api_url: url, token: token}}),
    do: {:ok, %{base_url: api_root(url), token: token}}

  def build(%WorkbenchTool{
        configuration: %Configuration{gitlab: %GitlabConnection{token: token, url: url}}
      }),
      do: {:ok, %{base_url: api_root(url), token: token}}

  def build(%WorkbenchTool{}),
    do: {:error, "GitLab connection is not configured for this workbench tool."}

  @doc false
  def api_root(url) when url in [nil, ""], do: @default_api_root

  def api_root(url) when is_binary(url) do
    url
    |> String.trim()
    |> String.trim_trailing("/")
    |> then(fn u ->
      cond do
        String.ends_with?(String.downcase(u), "/api/v4") -> u
        true -> u <> "/api/v4"
      end
    end)
  end

  @spec get(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def get(%{base_url: base, token: token}, path, query \\ %{}) when is_binary(path) do
    url = base <> path <> Query.query_string(query)
    headers = [{"PRIVATE-TOKEN", token}]

    Req.get(url, [headers: headers] ++ http_opts())
    |> Http.handle("GitLab")
  end

  @spec post(map(), String.t(), keyword()) :: {:ok, term()} | {:error, String.t()}
  def post(%{base_url: base, token: token}, path, opts \\ []) when is_binary(path) do
    query = Keyword.get(opts, :query, %{})
    url = base <> path <> Query.query_string(query)
    headers = [{"PRIVATE-TOKEN", token}]

    Req.post(url, [headers: headers, body: ""] ++ http_opts())
    |> Http.handle("GitLab")
  end

  @spec post_json(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def post_json(%{base_url: base, token: token}, path, body_map)
      when is_binary(path) and is_map(body_map) do
    url = base <> path
    headers = [{"PRIVATE-TOKEN", token}, {"Content-Type", "application/json"}]
    encoded = Jason.encode!(body_map)

    Req.post(url, [headers: headers, body: encoded] ++ http_opts())
    |> Http.handle("GitLab")
  end

  @spec put_json(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def put_json(%{base_url: base, token: token}, path, body_map)
      when is_binary(path) and is_map(body_map) do
    url = base <> path
    headers = [{"PRIVATE-TOKEN", token}, {"Content-Type", "application/json"}]
    encoded = Jason.encode!(body_map)

    Req.put(url, [headers: headers, body: encoded] ++ http_opts())
    |> Http.handle("GitLab")
  end

  @spec put(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def put(%{base_url: base, token: token}, path, query \\ %{}) when is_binary(path) do
    url = base <> path <> Query.query_string(query)
    headers = [{"PRIVATE-TOKEN", token}]

    Req.put(url, [headers: headers, body: ""] ++ http_opts())
    |> Http.handle("GitLab")
  end

  defp http_opts,
    do: Console.Utils.HTTP.client_options(:httpoison_gitlab_options, :req_gitlab_options)

  @doc false
  def encode_project_id(project) when is_integer(project), do: Integer.to_string(project)

  def encode_project_id(project) when is_binary(project) do
    project = String.trim(project)

    cond do
      project == "" ->
        ""

      Regex.match?(~r/^\d+$/, project) ->
        project

      true ->
        URI.encode_www_form(project)
    end
  end
end
