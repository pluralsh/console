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

  defp merge_connect(opts, connect) do
    Keyword.update(opts, :connect_options, connect, &Keyword.merge(&1, connect))
  end

  defp parse_proxy(url) do
    uri = URI.parse(url)
    scheme = if uri.scheme == "https", do: :https, else: :http
    {scheme, uri.host, uri.port || default_port(scheme), []}
  end

  defp default_port(:https), do: 443
  defp default_port(_), do: 80
end
