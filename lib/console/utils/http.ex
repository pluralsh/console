defmodule Console.Utils.HTTP do
  @moduledoc """
  Helpers for translating legacy HTTPoison-style request options into `Req`
  options. Some option sources (eg. SCM connection proxy settings, Tentacat
  request options) are still expressed in HTTPoison terms because they're shared
  with dependencies that continue to use HTTPoison. This module normalizes them
  for our own `Req` based clients.
  """

  @doc """
  Translates a keyword list of HTTPoison-style request options into the
  equivalent `Req` options. Unknown/unsupported keys are dropped since `Req`
  raises on unregistered options.
  """
  @spec req_options(keyword) :: keyword
  def req_options(opts) when is_list(opts) do
    Enum.reduce(opts, [], fn
      {:proxy, url}, acc when is_binary(url) ->
        merge_connect(acc, proxy: parse_proxy(url))

      {:proxy, {_, _, _, _} = proxy}, acc ->
        merge_connect(acc, proxy: proxy)

      {:recv_timeout, t}, acc ->
        Keyword.put(acc, :receive_timeout, t)

      {:timeout, t}, acc ->
        merge_connect(acc, timeout: t)

      {:ssl, ssl}, acc when is_list(ssl) ->
        merge_connect(acc, transport_opts: ssl)

      {:follow_redirect, follow?}, acc ->
        Keyword.put(acc, :redirect, follow?)

      {:max_redirect, max}, acc ->
        Keyword.put(acc, :max_redirects, max)

      _, acc ->
        acc
    end)
  end

  def req_options(_), do: []

  @doc """
  Resolves per-provider request options from application config while preserving
  backwards compatibility with the legacy HTTPoison-style `legacy_key`. Any
  values still configured under `legacy_key` (eg. `proxy`, `ssl`, `recv_timeout`)
  are translated into their `Req` equivalents, while values under `req_key` are
  treated as native `Req` options and take precedence when both are set.
  """
  @spec provider_options(atom, atom) :: keyword
  def provider_options(legacy_key, req_key) do
    legacy = req_options(Application.get_env(:console, legacy_key, []))
    Keyword.merge(legacy, Application.get_env(:console, req_key, []))
  end

  @client_defaults [receive_timeout: 60_000, decode_body: false, retry: false]

  @doc """
  Resolves per-provider `Req` options via `provider_options/2` layered on top of
  the shared client defaults (60s receive timeout, no automatic body decoding,
  no retries). Configured provider options win over the defaults.
  """
  @spec client_options(atom, atom) :: keyword
  def client_options(legacy_key, req_key) do
    Keyword.merge(@client_defaults, provider_options(legacy_key, req_key))
  end

  @doc """
  Builds `Req` proxy options for a request to `url` from a proxy config shaped
  like `%{url: proxy_url, noproxy: "host1,.domain2"}`. Returns no options when no
  proxy is configured or the request host matches a `noproxy` entry.
  """
  @spec proxy_options(map | nil, binary) :: keyword
  def proxy_options(%{enabled: false}, _), do: []
  def proxy_options(%{url: proxy} = config, url) when is_binary(proxy) and proxy != "" do
    case no_proxy?(config, url) do
      true -> []
      false -> req_options(proxy: proxy)
    end
  end
  def proxy_options(_, _), do: []

  @type validators :: %{etag: binary | nil, last_modified: binary | nil, sha: binary}

  @doc """
  GETs `url`, revalidating against the `validators` returned by the previous
  call: the etag and last-modified are sent as conditional headers, and a 200
  whose body hashes the same as last time also counts as unchanged, for servers
  that ignore them. Returns `{:ok, :unchanged, validators}` or
  `{:ok, body, validators}`; keep the validators for the next call.
  """
  @spec fetch_if_changed(binary, validators | nil, keyword) ::
          {:ok, :unchanged | binary, validators} | {:error, term}
  def fetch_if_changed(url, prev, opts \\ []) do
    opts = Keyword.merge([decode_body: false, retry: false, headers: conditional_headers(prev)], opts)
    case Req.get(url, opts) do
      {:ok, %Req.Response{status: 304}} when is_map(prev) -> {:ok, :unchanged, prev}
      {:ok, %Req.Response{status: 200, body: body} = resp} when is_binary(body) ->
        validators = %{
          etag: header(resp, "etag"),
          last_modified: header(resp, "last-modified"),
          sha: :crypto.hash(:sha256, body)
        }
        case prev do
          %{sha: sha} when sha == validators.sha -> {:ok, :unchanged, validators}
          _ -> {:ok, body, validators}
        end
      {:ok, %Req.Response{status: status}} -> {:error, "unexpected status #{status} fetching #{url}"}
      {:error, _} = err -> err
    end
  end

  defp conditional_headers(%{} = prev) do
    [{"if-none-match", prev[:etag]}, {"if-modified-since", prev[:last_modified]}]
    |> Enum.filter(fn {_, v} -> is_binary(v) end)
  end
  defp conditional_headers(_), do: []

  defp header(resp, name) do
    case Req.Response.get_header(resp, name) do
      [value | _] -> value
      _ -> nil
    end
  end

  defp no_proxy?(%{noproxy: noproxy}, url) when is_binary(noproxy) and is_binary(url) do
    host = URI.parse(url).host
    noproxy
    |> String.split(",", trim: true)
    |> Enum.map(&String.trim/1)
    |> Enum.any?(&matches_no_proxy?(host, &1))
  end
  defp no_proxy?(_, _), do: false

  defp matches_no_proxy?(host, pattern) when is_binary(host) and pattern != "" do
    pattern = String.trim_leading(pattern, ".")
    host == pattern || String.ends_with?(host, ".#{pattern}")
  end
  defp matches_no_proxy?(_, _), do: false

  defp merge_connect(opts, connect) do
    Keyword.update(opts, :connect_options, connect, &Keyword.merge(&1, connect))
  end

  defp parse_proxy(url) do
    uri = URI.parse(with_scheme(String.trim(url)))
    scheme = if uri.scheme == "https", do: :https, else: :http
    {scheme, uri.host, uri.port || default_port(scheme), []}
  end

  defp with_scheme(url) do
    case String.contains?(url, "://") do
      true -> url
      false -> "http://#{url}"
    end
  end

  defp default_port(:https), do: 443
  defp default_port(_), do: 80
end
