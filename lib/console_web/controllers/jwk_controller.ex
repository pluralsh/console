defmodule ConsoleWeb.JWKController do
  use ConsoleWeb, :controller
  alias Console.Jwt.MCP

  def mcp(conn, _params) do
    jwks = MCP.jwks()
    json(conn, %{keys: jwks})
  end
end
