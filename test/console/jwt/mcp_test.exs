defmodule Console.Jwt.MCPTest do
  use Console.DataCase, async: true
  alias Console.Jwt.MCP

  describe "#jws/0" do
    test "it will list valid public jwks" do
      [jwk] = MCP.jwks()

      jwk = JOSE.JWK.from_map(jwk)
      {_, _} = JOSE.JWK.to_map(jwk)
    end
  end

  describe "#mint/1" do
    test "it can mint a valid jwt for a user" do
      user   = insert(:user, roles: %{admin: true})
      member = insert(:group_member, user: user)

      {:ok, jwt, _} = MCP.mint(user)

      {:ok, %{"groups" => [g]} = claims} = MCP.exchange(jwt)

      assert claims["sub"] == user.email
      assert claims["admin"]
      assert g == member.group.name
    end
  end
end
