defmodule ConsoleWeb.JWTControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "exchange/2" do
    test "it will exchange a token for a user", %{conn: conn} do
      user = insert(:user)
      insert(:federated_credential,
        issuer: "https://oidc.plural.sh",
        user: user,
        claims_like: %{"sub" => user.email}
      )

      signer = Joken.Signer.create("HS256", "secret")
      {:ok, token, _} = Console.TestToken.generate_and_sign(%{
        "iss" => "https://oidc.plural.sh",
        "sub" => user.email
      }, signer)
      expect(Oidcc.Token, :validate_jwt, fn _, _, _ -> {:ok, %{"sub" => user.email}} end)

      %{"access_token" => token} =
        conn
        |> post("/v1/token/exchange", %{email: user.email, jwt: token})
        |> json_response(200)

      assert is_binary(token)
    end
  end
end
