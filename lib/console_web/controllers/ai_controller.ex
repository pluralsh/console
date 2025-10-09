defmodule ConsoleWeb.AIController do
  use ConsoleWeb, :controller
  import ConsoleWeb.IngestController, only: [convert_headers: 2, to_method: 1]
  alias ReverseProxyPlug.HTTPClient.Adapters.Req
  alias Console.Schema.Cluster
  alias Console.Deployments.Agents

  @timeouts [receive_timeout: :timer.seconds(300)]

  plug :verify

  def openai_chat_completions(conn, _) do
    with {:ok, proxy} <- Console.AI.Provider.proxy() do
      modify_conn(conn, proxy)
      |> do_proxy(Path.join(proxy.url, "/chat/completions"))
    else
      {:error, err} -> send_resp(conn, 402, "ai proxy config error: #{err}")
    end
  end

  def openai_embeddings(conn, _) do
    with {:ok, proxy} <- Console.AI.Provider.proxy() do
      modify_conn(conn, proxy)
      |> do_proxy(Path.join(proxy.url, "/embeddings"))
    else
      {:error, err} -> send_resp(conn, 402, "ai proxy config error: #{err}")
    end
  end

  def modify_conn(conn, proxy) do
    old_headers = Enum.reject(conn.req_headers, fn {k, _} -> k == "authorization" end)
    %{conn | req_headers: [{"Authorization", "Bearer #{proxy.token}"} | old_headers]}
    |> maybe_add_params(proxy)
  end

  def maybe_add_params(conn, %Console.AI.Proxy{params: %{} = params}) when map_size(params) > 0 do
    existing = fetch_query_params(conn)
    %{conn | query_string: URI.encode_query(Map.merge(existing, params)), params: Map.merge(existing, params)}
  end
  def maybe_add_params(conn, _), do: conn

  def do_proxy(conn, upstream) do
    opts = ReverseProxyPlug.init(upstream: upstream, response_mode: :stream)
    {body, conn} = ReverseProxyPlug.read_body(conn)
    conn = add_nginx_headers(conn)
    %ReverseProxyPlug.HTTPClient.Request{
      method: to_method(conn.method),
      url: upstream,
      headers: convert_headers(conn, upstream),
      body: body,
      options: @timeouts
    }
    |> Req.request_stream()
    |> ReverseProxyPlug.response(conn, opts)
    |> halt()
  end

  def verify(conn, _) do
    with [token | _] <- get_req_header(conn, "authorization"),
         %Cluster{} = cluster <- Console.authed_user(extract(token)),
         true <- Agents.has_runtime?(cluster) do
      conn
    else
      _ -> send_resp(conn, 401, "unauthenticated") |> halt()
    end
  end

  defp extract(token) do
    case Regex.run(~r/^Bearer\s+(.*)$/, token) do
      [_, match] -> match
      _ -> token
    end
  end

  defp add_nginx_headers(conn) do
    conn
    |> put_resp_header("x-accel-buffering", "no")
    |> put_resp_header("cache-control", "no-cache")
    |> put_resp_header("connection", "keep-alive")
  end
end
