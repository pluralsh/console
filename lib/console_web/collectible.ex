defimpl Collectable, for: Plug.Conn do
  def into(conn) do
    fun = fn
      conn, {:cont, data} when is_binary(data) ->
        case Plug.Conn.chunk(conn, data) do
          {:ok, conn} -> conn
          err -> raise ArgumentError, "failed to chunk data: #{inspect(err)}"
        end
      conn, :done -> conn
      _, :halt -> :ok
      _, {:cont, data} -> raise ArgumentError, "expected binary data, got #{inspect(data)}"
    end

    Plug.Conn.put_resp_content_type(conn, "application/octet-stream")
    |> Plug.Conn.send_chunked(200)
    |> then(& {&1, fun})
  end
end
