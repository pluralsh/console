defmodule Console.AI.Tools.Workbench.Integration.AzureDevops.Client do
  @moduledoc false

  alias Console.AI.Tools.Workbench.Integration.Http
  alias Console.Schema.{WorkbenchTool, ScmConnection}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.AzureDevopsConnection}

  @default_base "https://dev.azure.com"

  @spec build(WorkbenchTool.t()) :: {:ok, map()} | {:error, String.t()}
  def build(%WorkbenchTool{scm_connection: %ScmConnection{api_url: url, token: token}})
      when is_binary(url) and url != "",
      do: {:ok, %{base_url: normalize_base(url), token: token}}

  def build(%WorkbenchTool{scm_connection: %ScmConnection{base_url: url, token: token}})
      when is_binary(url) and url != "",
      do: {:ok, %{base_url: normalize_base(url), token: token}}

  def build(%WorkbenchTool{scm_connection: %ScmConnection{token: token}}),
    do: {:ok, %{base_url: normalize_base(""), token: token}}

  def build(%WorkbenchTool{
        configuration: %Configuration{azure_devops: %AzureDevopsConnection{} = ado}
      }) do
    with {:ok, token} <- token_value(ado) do
      {:ok, %{base_url: normalize_base(ado.url), token: token}}
    end
  end

  def build(%WorkbenchTool{}),
    do: {:error, "Azure DevOps connection is not configured for this workbench tool."}

  defp token_value(%AzureDevopsConnection{token: t}) when is_binary(t) and t != "", do: {:ok, t}
  defp token_value(_), do: {:error, "Azure DevOps PAT is missing or invalid."}

  defp normalize_base(url) when url in [nil, ""], do: String.trim_trailing(@default_base, "/")

  defp normalize_base(url) when is_binary(url) do
    url |> String.trim() |> String.trim_trailing("/")
  end

  defp encode_uri_segment(s) when is_binary(s), do: URI.encode(s, &URI.char_unreserved?/1)

  @doc """
  Builds `{scheme}://{host}{path_prefix}/{encoded_project}` for `_apis/...` calls.

  When the configured URL is bare `https://dev.azure.com`, `organization` must be set.
  When the URL already includes the organization (`https://dev.azure.com/org` or on-premises
  collection root), `organization` may be omitted.
  """
  @spec project_api_root(map(), String.t() | nil, String.t()) ::
          {:ok, String.t()} | {:error, String.t()}
  def project_api_root(%{base_url: base_url}, organization, project) when is_binary(project) do
    project = String.trim(project)
    enc_project = encode_uri_segment(project)

    case URI.parse(base_url) do
      %URI{scheme: scheme, host: host} = uri
      when scheme in ["http", "https"] and is_binary(host) ->
        path = uri.path || ""
        segments = path |> String.trim("/") |> path_segments()

        cond do
          dev_azure_host?(host) and segments == [] ->
            case organization do
              org when is_binary(org) and org != "" ->
                org = String.trim(org)
                {:ok, "#{scheme}://#{host}/#{encode_uri_segment(org)}/#{enc_project}"}

              _ ->
                {:error,
                 "Azure DevOps organization is required in tool arguments when the API URL is bare https://dev.azure.com (or set the URL to https://dev.azure.com/{organization})."}
            end

          dev_azure_host?(host) and segments != [] ->
            prefix = Enum.map_join(segments, "/", &encode_uri_segment/1)
            {:ok, "#{scheme}://#{host}/#{prefix}/#{enc_project}"}

          true ->
            prefix = base_url |> String.trim_trailing("/")
            {:ok, "#{prefix}/#{enc_project}"}
        end

      _ ->
        {:error, "Invalid Azure DevOps API URL: #{inspect(base_url)}"}
    end
  end

  defp path_segments(""), do: []
  defp path_segments(p), do: String.split(p, "/", trim: true)

  defp dev_azure_host?("dev.azure.com"), do: true
  defp dev_azure_host?(host) when is_binary(host), do: String.ends_with?(host, ".dev.azure.com")
  defp dev_azure_host?(_), do: false

  @spec encode_repo_id(String.t()) :: String.t()
  def encode_repo_id(repo) when is_binary(repo) do
    repo |> String.trim() |> encode_uri_segment()
  end

  @spec encode_path_segment(String.t()) :: String.t()
  def encode_path_segment(part) when is_binary(part),
    do: part |> String.trim() |> encode_uri_segment()

  def basic_auth_header(%{token: token}) do
    basic = Base.encode64(":" <> token)
    [{"Authorization", "Basic #{basic}"}]
  end

  def json_auth_headers(client) do
    basic_auth_header(client) ++ [{"Content-Type", "application/json"}]
  end

  @spec get_json(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def get_json(%{token: _} = client, url, query \\ %{}) when is_binary(url) do
    qs =
      case query do
        %{} = m when map_size(m) == 0 -> ""
        %{} = m -> "?" <> URI.encode_query(m, :safe)
        _ -> ""
      end

    req_url = url <> qs

    case HTTPoison.get(req_url, basic_auth_header(client), http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Azure DevOps API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        Http.error("Azure DevOps", reason)
    end
  end

  @spec post_json(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def post_json(%{token: _} = client, url, body_map) when is_binary(url) and is_map(body_map) do
    encoded = Jason.encode!(body_map)
    headers = json_auth_headers(client)

    case HTTPoison.post(url, encoded, headers, http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Azure DevOps API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        Http.error("Azure DevOps", reason)
    end
  end

  @spec put_json(map(), String.t(), map()) :: {:ok, term()} | {:error, String.t()}
  def put_json(%{token: _} = client, url, body_map \\ %{}) when is_binary(url) do
    {encoded, headers} =
      if map_size(body_map) == 0 do
        {"", basic_auth_header(client)}
      else
        {Jason.encode!(body_map), json_auth_headers(client)}
      end

    case HTTPoison.put(url, encoded, headers, http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Azure DevOps API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        Http.error("Azure DevOps", reason)
    end
  end

  @spec post_empty(map(), String.t()) :: {:ok, term()} | {:error, String.t()}
  def post_empty(%{token: _} = client, url) when is_binary(url) do
    case HTTPoison.post(url, "", basic_auth_header(client), http_opts()) do
      {:ok, %HTTPoison.Response{status_code: code, body: body}} when code >= 200 and code < 300 ->
        decode_json(body)

      {:ok, %HTTPoison.Response{status_code: code, body: body}} ->
        {:error, "Azure DevOps API #{code}: #{inspect(body)}"}

      {:error, reason} ->
        Http.error("Azure DevOps", reason)
    end
  end

  defp decode_json(""), do: {:ok, %{}}

  defp decode_json(body) do
    case Jason.decode(body) do
      {:ok, data} -> {:ok, data}
      {:error, _} -> {:error, "Azure DevOps returned non-JSON body: #{inspect(body)}"}
    end
  end

  defp http_opts,
    do:
      Application.get_env(:console, :httpoison_azure_devops_options, []) ++ [recv_timeout: 60_000]
end
