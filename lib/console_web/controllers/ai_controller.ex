defmodule ConsoleWeb.AIController do
  use ConsoleWeb, :controller
  import ConsoleWeb.IngestController, only: [convert_headers: 2]
  alias Console.Schema.Cluster
  alias Console.Deployments.Agents

  @options [recv_timeout: :infinity, timeout: :infinity]

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
    {body, conn} = ReverseProxyPlug.read_body(conn)
    conn = add_nginx_headers(conn)

    url = find_uri(upstream, conn.query_string)

    case HTTPoison.post(
      url,
      Enum.reverse(body) |> IO.iodata_to_binary(),
      convert_headers(conn, upstream),
      [stream_to: self(), async: :once] ++ @options
    ) do
      {:ok, %HTTPoison.AsyncResponse{} = resp} ->
        do_stream(conn, resp)
      {:error, _} ->
        send_resp(conn, 500, "error proxying request")
    end
  end

  defp do_stream(conn, %HTTPoison.AsyncResponse{} = resp) do
    with {:ok, resp} <- HTTPoison.stream_next(resp) do
      receive do
        %HTTPoison.AsyncStatus{code: code} ->
          put_status(conn, code)
          |> do_stream(resp)

        %HTTPoison.AsyncHeaders{headers: headers} ->
          Enum.reduce(headers, conn, fn {k, v}, conn ->
            put_resp_header(conn, String.downcase(k), v)
          end)
          |> send_chunked(conn.status)
          |> do_stream(resp)

        %HTTPoison.AsyncChunk{chunk: chunk} ->
          case chunk(conn, chunk) do
            {:ok, conn} -> do_stream(conn, resp)
            {:error, _} -> conn
          end

        %HTTPoison.AsyncEnd{} -> conn
      end
    else
      _ -> send_resp(conn, 500, "error streaming response")
    end
  end

  defp find_uri(upstream, query_string) when is_binary(query_string) and byte_size(query_string) > 0,
    do: "#{upstream}?#{query_string}"
  defp find_uri(upstream, _), do: upstream

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
