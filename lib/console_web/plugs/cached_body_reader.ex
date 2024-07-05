defmodule ConsoleWeb.CacheBodyReader do
  def read_body(conn, opts) do
    case Plug.Conn.read_body(conn, opts) do
      {:ok, body, conn} -> {:ok, body, append_body(conn, body)}
      {:more, body, conn} -> {:more, body, append_body(conn, body)}
      err -> err
    end
  end

  defp append_body(conn, body), do: update_in(conn.assigns[:raw_body], & [body | (&1 || [])])
end
