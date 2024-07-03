defmodule ConsoleWeb.Plugs.SecureHeaders do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    conn
    |> put_resp_header("x-frame-options", "ALLOW-FROM #{Console.url("/")}")
    |> put_resp_header("content-security-policy", "frame-ancestors #{Console.url("/")};")
  end
end
