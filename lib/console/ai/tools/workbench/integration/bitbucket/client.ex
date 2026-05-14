defmodule Console.AI.Tools.Workbench.Integration.Bitbucket.Client do
  @moduledoc false

  alias Console.Schema.{WorkbenchTool, ScmConnection}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.BitbucketConnection}

  @default_api_root "https://api.bitbucket.org/2.0"

  @spec build(WorkbenchTool.t()) :: {:ok, map()} | {:error, String.t()}
  def build(%WorkbenchTool{scm_connection: %ScmConnection{base_url: base, token: token}}),
    do: {:ok, %{base_url: api_root(base), token: token}}
  def build(%WorkbenchTool{configuration: %Configuration{bitbucket: %BitbucketConnection{token: token, url: url}}}) do
    {:ok, %{base_url: api_root(url), token: token}}
  end
  def build(%WorkbenchTool{}),
    do: {:error, "Bitbucket Cloud connection is not configured for this workbench tool."}

  @doc false
  def api_root(url) when url in [nil, ""], do: @default_api_root
  def api_root(url) when is_binary(url) do
    url
    |> String.trim()
    |> String.trim_trailing("/")
    |> then(fn u ->
      cond do
        String.ends_with?(String.downcase(u), "/2.0") -> u
        true -> u <> "/2.0"
      end
    end)
  end

  @spec parse_repository(String.t()) :: {:ok, String.t(), String.t()} | {:error, String.t()}
  def parse_repository(repository) when is_binary(repository) do
    case String.split(String.trim(repository), "/", parts: 2) do
      [workspace, repo_slug] when workspace != "" and repo_slug != "" ->
        {:ok, workspace, repo_slug}

      _ ->
        {:error, "repository must be workspace/repo_slug (e.g. atlassian/atlaskit)."}
    end
  end

  @spec get(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def get(%{base_url: base, token: token}, path, query \\ %{}) when is_binary(path) do
    qs =
      case query do
        %{} = m when map_size(m) == 0 -> ""
        %{} = m -> "?" <> URI.encode_query(stringify_query(m), :safe)
        _ -> ""
      end

    url = base <> path <> qs

    case HTTPoison.get(url, auth_headers(token), http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Bitbucket Cloud API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end

  @spec post_json(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def post_json(%{base_url: base, token: token}, path, body_map)
      when is_binary(path) and is_map(body_map) do
    url = base <> path
    headers = auth_headers(token) ++ [{"Content-Type", "application/json"}]

    case HTTPoison.post(url, Jason.encode!(body_map), headers, http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Bitbucket Cloud API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end

  @spec repo_path(String.t(), String.t()) :: String.t()
  def repo_path(workspace, repo_slug),
    do: "/repositories/#{enc(workspace)}/#{enc(repo_slug)}"

  defp auth_headers(token) do
    [
      {"Authorization", "Bearer #{token}"},
      {"Accept", "application/json"}
    ]
  end

  defp stringify_query(map) do
    map
    |> Enum.reject(fn {_, v} -> is_nil(v) end)
    |> Enum.map(fn {k, v} -> {to_string(k), v} end)
    |> Map.new()
  end

  defp decode_json(""), do: {:ok, %{}}

  defp decode_json(body) do
    case Jason.decode(body) do
      {:ok, data} -> {:ok, data}
      {:error, _} -> {:error, "Bitbucket Cloud returned non-JSON body: #{inspect(body)}"}
    end
  end

  defp enc(s) when is_binary(s), do: URI.encode(String.trim(s), &URI.char_unreserved?/1)

  defp http_opts,
    do: Application.get_env(:console, :httpoison_bitbucket_options, []) ++ [recv_timeout: 60_000]
end
