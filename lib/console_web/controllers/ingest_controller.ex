defmodule ConsoleWeb.IngestController do
  use ConsoleWeb, :controller
  alias ConsoleWeb.Plugs.Ingest
  alias ReverseProxyPlug.HTTPClient.Adapters.Req

  def prometheus(conn, _) do
    prom = Ingest.prom_url()
    do_proxy(conn, prom, true)
  end

  def prom_query(conn, _) do
    prom = Ingest.prom_select_url()
    do_proxy(conn, prom)
  end

  def es_root(conn, _) do
    elastic = Ingest.elastic_url("/")
    do_proxy(conn, elastic)
  end

  def es_bulk(conn, _) do
    elastic = Ingest.elastic_url("/_bulk")
    do_proxy(conn, elastic, true)
  end

  def es_license(conn, _) do
    elastic = Ingest.elastic_url("/_license")
    do_proxy(conn, elastic)
  end

  defp do_proxy(conn, upstream, meter \\ false) do
    opts = ReverseProxyPlug.init(upstream: upstream, response_mode: :stream)
    {body, conn} = ReverseProxyPlug.read_body(conn)
    if meter do
      Console.Prom.Meter.incr(byte_size(body))
    end

    %ReverseProxyPlug.HTTPClient.Request{
      method: to_method(conn.method),
      url: upstream,
      headers: convert_headers(conn, upstream),
      body: body,
      options: [receive_timeout: :timer.seconds(30)]
    }
    |> Req.request_stream()
    |> ReverseProxyPlug.response(conn, opts)
    |> halt()
  end

  def to_method("GET"), do: :get
  def to_method("POST"), do: :post
  def to_method("PUT"), do: :put
  def to_method("DELETE"), do: :delete
  def to_method("PATCH"), do: :patch
  def to_method(_), do: :get

  def convert_headers(conn, url) do
    headers =
      conn.req_headers
      |> remove_hop_by_hop_headers()
      |> add_x_fwd_for_header(conn)

    host = host_header_from_url(url)
    List.keystore(headers, "host", 0, {"host", host})
  end

  @hop_by_hop_headers ~w(te transfer-encoding trailer connection keep-alive proxy-authenticate proxy-authorization upgrade)

  defp remove_hop_by_hop_headers(headers) do
    # We downcase here, in case a custom :normalize_headers function does not downcase headers
    Enum.reject(headers, fn {header, _} ->
      Enum.member?(@hop_by_hop_headers, String.downcase(header))
    end)
  end

  defp add_x_fwd_for_header(headers, conn) do
    {x_fwd_for, headers} = Enum.split_with(headers, fn {k, _v} -> k == "x-forwarded-for" end)
    remote_ip = conn.remote_ip |> :inet.ntoa() |> to_string()
    x_forwarded_for = case x_fwd_for do
      [{"x-forwarded-for", x_fwd_value}] ->
        "#{x_fwd_value}, #{remote_ip}"

      _ ->
        remote_ip
    end

    [{"x-forwarded-for", x_forwarded_for} | headers]
  end

  defp host_header_from_url(url) when is_binary(url) do
    url |> URI.parse() |> host_header_from_url
  end

  defp host_header_from_url(%URI{host: host, port: nil}) do
    host
  end

  defp host_header_from_url(%URI{host: host, port: 80, scheme: "http"}) do
    host
  end

  defp host_header_from_url(%URI{host: host, port: 443, scheme: "https"}) do
    host
  end

  defp host_header_from_url(%URI{host: host, port: port, scheme: "http"}) do
    "#{host}:#{port}"
  end

  defp host_header_from_url(%URI{host: host, port: port, scheme: "https"}) do
    "#{host}:#{port}"
  end
end
