defmodule Console.Services.OAuthTest do
  use Console.DataCase, async: true
  use Mimic

  alias Console.Services.OAuth

  @id_claims %{"email" => "user@example.com", "sub" => "user-1", "groups_direct" => ["org/direct"]}

  describe "retrieve_claims/1" do
    test "returns the ID token and does not call userinfo when the flag is off" do
      stub_provider(false)
      token = id_token()

      expect(Oidcc, :retrieve_token, fn "code", Console.OidcConfigProvider, "client-id", "client-secret", _opts ->
        {:ok, token}
      end)

      reject(&Oidcc.retrieve_userinfo/5)

      assert {:ok, @id_claims} = OAuth.retrieve_claims(%{code: "code"})
    end

    test "merges userinfo groups over the ID token when the flag is on" do
      stub_provider(true)
      token = id_token()

      expect(Oidcc, :retrieve_token, fn "code", Console.OidcConfigProvider, "client-id", "client-secret", _opts ->
        {:ok, token}
      end)

      expect(Oidcc, :retrieve_userinfo, fn ^token, Console.OidcConfigProvider, "client-id", "client-secret", %{} ->
        {:ok, %{"sub" => "user-1", "groups" => ["org/platform"]}}
      end)

      assert {:ok, claims} = OAuth.retrieve_claims(%{code: "code"})
      assert claims["email"] == "user@example.com"
      assert claims["groups"] == ["org/platform"]
      assert claims["groups_direct"] == ["org/direct"]
    end

    test "returns an error when userinfo fails" do
      stub_provider(true)

      expect(Oidcc, :retrieve_token, fn "code", Console.OidcConfigProvider, "client-id", "client-secret", _opts ->
        {:ok, id_token()}
      end)

      expect(Oidcc, :retrieve_userinfo, fn _token, Console.OidcConfigProvider, "client-id", "client-secret", %{} ->
        {:error, :timeout}
      end)

      assert {:error, "oidc userinfo error: " <> _} = OAuth.retrieve_claims(%{code: "code"})
    end
  end

  defp stub_provider(userinfo) do
    stub(Console, :conf, fn
      :oidc_providers ->
        [
          plural: [
            client_id: "client-id",
            client_secret: "client-secret",
            redirect_uri: "https://console.example/oauth/callback",
            scope: "openid email",
            userinfo: userinfo
          ]
        ]

      key ->
        Application.get_env(:console, key)
    end)
  end

  defp id_token do
    %Oidcc.Token{
      id: %Oidcc.Token.Id{token: "id-token", claims: @id_claims}
    }
  end
end
