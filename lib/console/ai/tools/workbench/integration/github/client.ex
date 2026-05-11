defmodule Console.AI.Tools.Workbench.Integration.Github.Client do
  @moduledoc false

  alias Console.Jwt.Github, as: GithubJwt
  alias Console.Schema.WorkbenchTool
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.GithubConnection}

  @doc false
  @spec plain_get(Tentacat.Client.t(), String.t(), [{String.t(), String.t()}]) ::
          {:ok, String.t()} | {:error, String.t()}
  def plain_get(%Tentacat.Client{} = client, path, extra_headers \\ []) when is_binary(path) do
    url = client.endpoint <> path
    tentacat_extra = Application.get_env(:tentacat, :extra_headers, [])
    req_opts = (client.request_options || []) ++ Application.get_env(:tentacat, :request_options, [])

    headers =
      tentacat_extra ++
        Tentacat.authorization_header(client.auth, extra_headers ++ [{"User-agent", "tentacat"}])

    case HTTPoison.request(:get, url, "", headers, req_opts) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        {:ok, body}

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "GitHub API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end

  @spec build(WorkbenchTool.t()) :: {:ok, Tentacat.Client.t()} | {:error, String.t()}
  def build(%WorkbenchTool{configuration: %Configuration{github: %GithubConnection{} = gh}}),
    do: resolve_tentacat(gh)

  def build(%WorkbenchTool{}),
    do: {:error, "GitHub connection is not configured for this workbench tool."}

  defp resolve_tentacat(%GithubConnection{app_id: id} = gh) when is_binary(id) do
    api_endpoint(gh)
    |> GithubJwt.gh_client(id, gh.installation_id, gh.private_key, [])
  end

  defp resolve_tentacat(%GithubConnection{access_token: token} = gh),
    do: {:ok, Tentacat.Client.new(%{access_token: token}, api_endpoint(gh))}

  defp api_endpoint(%GithubConnection{url: url}) do
    url
    |> normalize_mcp_url()
    |> github_rest_endpoint()
  end

  defp normalize_mcp_url(url) when url in [nil, ""], do: ""

  defp normalize_mcp_url(url) do
    url
    |> String.trim()
    |> String.trim_trailing("/")
    |> String.replace(~r"/mcp(/.*)?$", "")
  end

  defp github_rest_endpoint("") do
    "https://api.github.com/"
  end

  defp github_rest_endpoint(base) do
    cond do
      String.contains?(base, "githubcopilot.com") ->
        "https://api.github.com/"

      String.contains?(base, "api.github.com") ->
        ensure_trailing_slash(base)

      true ->
        base
        |> ensure_trailing_slash()
        |> then(fn b ->
          if String.contains?(b, "/api/v3"), do: b, else: b <> "api/v3/"
        end)
    end
  end

  defp ensure_trailing_slash(url) do
    if String.ends_with?(url, "/"), do: url, else: url <> "/"
  end
end
