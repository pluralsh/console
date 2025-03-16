defmodule ConsoleWeb.JWKControllerTest do
  use ConsoleWeb.ConnCase, async: true
  alias Console.Jwt.MCP

  describe "mcp/2" do
    test "it can fetch the current valid mcp jwks", %{conn: conn} do
      user = insert(:user)
      {:ok, jwt, _} = MCP.mint(user)

      %{"keys" => [jwk]} =
        conn
        |> get("/mcp/.well-known/jwks.json")
        |> json_response(200)

      signer = Joken.Signer.create(jwk["alg"], jwk)
      {:ok, %{"sub" => sub}} = MCP.verify(jwt, signer)

      assert sub == user.email
    end
  end
end
