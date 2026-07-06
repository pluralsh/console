defmodule ConsoleWeb.ReqStream do
  @moduledoc """
  Helpers for streaming Req responses into chunked Plug responses.
  """

  import Plug.Conn, only: [chunk: 2, put_resp_header: 3, send_chunked: 2]

  @stream_timeout :timer.seconds(30)
  @hop_by_hop_headers ~w(
    connection
    content-length
    keep-alive
    proxy-authenticate
    proxy-authorization
    te
    trailer
    transfer-encoding
    upgrade
  )

  @type stream_opt :: {:error_message, binary}

  @spec get(Plug.Conn.t(), Req.Request.t(), keyword, [stream_opt]) :: Plug.Conn.t() | {:error, binary}
  def get(conn, %Req.Request{} = req, req_opts, stream_opts \\ []) do
    req
    |> Req.get(Keyword.put(req_opts, :into, :self))
    |> stream_response(conn, stream_opts)
  end

  defp stream_response({:ok, %Req.Response{status: status} = resp}, conn, _opts) when status in 200..299 do
    conn
    |> put_headers(resp.headers)
    |> send_chunked(status)
    |> stream(resp)
  end

  defp stream_response({:ok, %Req.Response{status: status} = resp}, _conn, opts) do
    cancel_async_response(resp)
    {:error, "#{error_message(opts)} with status #{status}"}
  end

  defp stream_response({:error, reason}, _conn, opts), do: {:error, "#{error_message(opts)}: #{inspect(reason)}"}

  defp stream(conn, %Req.Response{body: %Req.Response.Async{ref: ref}} = resp) do
    receive do
      {^ref, {:data, data}} ->
        chunk_data(conn, resp, data)

      {^ref, :done} ->
        conn

      {^ref, {:trailers, _trailers}} ->
        stream(conn, resp)

      {^ref, {:error, _reason}} ->
        conn
    after
      @stream_timeout ->
        cancel_async_response(resp)
        conn
    end
  end

  defp chunk_data(conn, resp, data) when is_binary(data) do
    case chunk(conn, data) do
      {:ok, conn} -> stream(conn, resp)
      {:error, _} -> conn
    end
  end

  defp put_headers(conn, headers) when is_map(headers) do
    Enum.reduce(headers, conn, fn
      {name, values}, conn when is_binary(name) and is_list(values) ->
        put_header(conn, String.downcase(name), values)

      _, conn ->
        conn
    end)
  end

  defp put_header(conn, name, _values) when name in @hop_by_hop_headers, do: conn
  defp put_header(conn, name, values), do: put_resp_header(conn, name, Enum.join(values, ", "))

  defp cancel_async_response(%Req.Response{body: %Req.Response.Async{}} = resp), do: Req.cancel_async_response(resp)
  defp cancel_async_response(_), do: :ok

  defp error_message(opts), do: Keyword.get(opts, :error_message, "Request failed")
end
