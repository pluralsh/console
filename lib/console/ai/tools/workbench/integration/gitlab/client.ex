defmodule Console.AI.Tools.Workbench.Integration.Gitlab.Client do
  @moduledoc false

  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GitlabConnection}

  @default_api_root "https://gitlab.com/api/v4"

  @spec build(WorkbenchTool.t()) :: {:ok, map()} | {:error, String.t()}
  def build(%WorkbenchTool{configuration: %Configuration{gitlab: %GitlabConnection{} = gl}}) do
    with {:ok, token} <- token_value(gl) do
      {:ok, %{base_url: api_root(gl.url), token: token}}
    end
  end

  def build(%WorkbenchTool{}),
    do: {:error, "GitLab connection is not configured for this workbench tool."}

  defp token_value(%GitlabConnection{token: t}) when is_binary(t) and t != "", do: {:ok, t}
  defp token_value(_), do: {:error, "GitLab token is missing or invalid."}

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
    qs =
      case query do
        %{} = m when map_size(m) == 0 -> ""
        %{} = m -> "?" <> URI.encode_query(m, :safe)
        _ -> ""
      end

    url = base <> path <> qs
    headers = [{"PRIVATE-TOKEN", token}]

    case HTTPoison.get(url, headers, http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "GitLab API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end

  @spec post(map(), String.t(), keyword()) :: {:ok, term()} | {:error, String.t()}
  def post(%{base_url: base, token: token}, path, opts \\ []) when is_binary(path) do
    query = Keyword.get(opts, :query, %{})

    qs =
      case query do
        %{} = m when map_size(m) == 0 -> ""
        %{} = m -> "?" <> URI.encode_query(m, :safe)
        _ -> ""
      end

    url = base <> path <> qs
    headers = [{"PRIVATE-TOKEN", token}]

    case HTTPoison.post(url, "", headers, http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "GitLab API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end

  @spec post_json(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def post_json(%{base_url: base, token: token}, path, body_map)
      when is_binary(path) and is_map(body_map) do
    url = base <> path
    headers = [{"PRIVATE-TOKEN", token}, {"Content-Type", "application/json"}]
    encoded = Jason.encode!(body_map)

    case HTTPoison.post(url, encoded, headers, http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "GitLab API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end

  defp decode_json(""), do: {:ok, %{}}

  defp decode_json(body) do
    case Jason.decode(body) do
      {:ok, data} -> {:ok, data}
      {:error, _} -> {:error, "GitLab returned non-JSON body: #{inspect(body)}"}
    end
  end

  defp http_opts,
    do: Application.get_env(:console, :httpoison_gitlab_options, []) ++ [recv_timeout: 60_000]

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
