defmodule ConsoleWeb.Plugs.EnsureAuthenticated do
  import Plug.Conn
  alias Console.Schema.User

  def init(opts), do: opts

  def call(conn, _opts) do
    case Guardian.Plug.current_resource(conn) do
      %User{} -> conn
      _ -> unauthorized(conn)
    end
  end

  @error_msg Jason.encode!(%{
    message: "Unauthorized",
    reason: "You must provide appropriate credentials in the Authorization header, either `Token {token}` or `Bearer {jwt}`"
  })

  defp unauthorized(conn) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(401, @error_msg)
    |> halt()
  end
end
