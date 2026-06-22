defmodule Console.AI.Tools.Workbench.Integration.BitbucketDatacenter.Client do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Integration.{Http, Query}
  alias Console.Schema.{ScmConnection, WorkbenchTool}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketDatacenterConnection}

  @spec build(WorkbenchTool.t()) :: {:ok, map()} | {:error, String.t()}
  def build(%WorkbenchTool{scm_connection: %ScmConnection{api_url: url, token: token}}),
    do:
      {:ok,
       %{api_base: api_base(url), reactions_base: reactions_base(api_base(url)), token: token}}

  def build(%WorkbenchTool{
        configuration: %Configuration{
          bitbucket_datacenter: %BitbucketDatacenterConnection{token: token, url: url}
        }
      }) do
    api_base = api_base(url)
    {:ok, %{api_base: api_base, reactions_base: reactions_base(api_base), token: token}}
  end

  def build(%WorkbenchTool{}),
    do: {:error, "Bitbucket Data Center connection is not configured for this workbench tool."}

  @doc false
  def api_base(url) when is_binary(url) do
    u = url |> String.trim() |> String.trim_trailing("/")

    cond do
      Regex.match?(~r{/rest/api/(latest|[0-9.]+)\z}i, u) -> u
      true -> u <> "/rest/api/latest"
    end
  end

  @doc false
  def reactions_base(api_base) when is_binary(api_base) do
    String.replace(api_base, ~r{/rest/api/(latest|[0-9.]+)\z}i, "/rest/comment-likes/\\1")
  end

  @spec parse_repository(String.t()) :: {:ok, String.t(), String.t()} | {:error, String.t()}
  def parse_repository(project) when is_binary(project) do
    case String.split(String.trim(project), "/", parts: 2) do
      [key, slug] when key != "" and slug != "" -> {:ok, key, slug}
      _ -> {:error, "repository must be PROJECT_KEY/repository_slug (e.g. ACME/my-service)."}
    end
  end

  @spec get(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def get(%{api_base: base, token: token}, path, query \\ %{}) when is_binary(path) do
    url = base <> path <> Query.query_string(query)

    case HTTPoison.get(url, auth_headers(token), http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Bitbucket Data Center API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        Http.error("Bitbucket Data Center", reason)
    end
  end

  @spec post_json(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def post_json(%{api_base: base, token: token}, path, body_map)
      when is_binary(path) and is_map(body_map) do
    url = base <> path
    headers = auth_headers(token) ++ [{"Content-Type", "application/json"}]

    case HTTPoison.post(url, Jason.encode!(body_map), headers, http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Bitbucket Data Center API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        Http.error("Bitbucket Data Center", reason)
    end
  end

  @spec put_empty(map(), String.t()) :: {:ok, term()} | {:error, String.t()}
  def put_empty(%{token: token}, url) when is_binary(url) do
    headers = auth_headers(token) ++ [{"Content-Type", "application/json"}]

    case HTTPoison.put(url, "", headers, http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Bitbucket Data Center API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        Http.error("Bitbucket Data Center", reason)
    end
  end

  @doc false
  def reaction_url(
        %{reactions_base: rb, token: _},
        project_key,
        repo_slug,
        :pull_request,
        pr_id,
        comment_id,
        emoticon
      ) do
    pr_id = to_string(pr_id)
    comment_id = to_string(comment_id)
    emoticon = URI.encode(String.trim(emoticon), &URI.char_unreserved?/1)

    rb <>
      "/projects/#{enc_seg(project_key)}/repos/#{enc_seg(repo_slug)}/pull-requests/#{pr_id}/comments/#{comment_id}/reactions/#{emoticon}"
  end

  def reaction_url(
        %{reactions_base: rb, token: _},
        project_key,
        repo_slug,
        :issue,
        issue_id,
        comment_id,
        emoticon
      ) do
    issue_id = to_string(issue_id)
    comment_id = to_string(comment_id)
    emoticon = URI.encode(String.trim(emoticon), &URI.char_unreserved?/1)

    rb <>
      "/projects/#{enc_seg(project_key)}/repos/#{enc_seg(repo_slug)}/issues/#{issue_id}/comments/#{comment_id}/reactions/#{emoticon}"
  end

  defp enc_seg(s) when is_binary(s), do: URI.encode(String.trim(s), &URI.char_unreserved?/1)

  # PAT as HTTP Basic password (any non-empty username works; x-token-auth is conventional for Bitbucket Server).
  defp auth_headers(token) do
    basic = Base.encode64("x-token-auth:" <> token)

    [
      {"Authorization", "Basic #{basic}"},
      {"Accept", "application/json"}
    ]
  end

  defp decode_json(""), do: {:ok, %{}}

  defp decode_json(body) do
    case Jason.decode(body) do
      {:ok, data} -> {:ok, data}
      {:error, _} -> {:error, "Bitbucket Data Center returned non-JSON body: #{inspect(body)}"}
    end
  end

  defp http_opts,
    do:
      Application.get_env(:console, :httpoison_bitbucket_datacenter_options, []) ++
        [recv_timeout: 60_000]
end
