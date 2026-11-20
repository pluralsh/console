defmodule Console.Services.OAuthTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Services.OAuth

  @client_id "console"
  @token_url "https://idp.example.com/oauth2/token"

  setup do
    prev = Application.get_env(:console, :oidc_providers)
    on_exit(fn -> Application.put_env(:console, :oidc_providers, prev) end)
    :ok
  end

  describe "#retrieve_token/1" do
    test "it authenticates with a client secret by default" do
      configure(client_secret: "secret")

      expect(Oidcc, :retrieve_token, fn "code", _, @client_id, "secret", opts ->
        refute Map.has_key?(opts, :body_extension)
        assert opts.redirect_uri == "https://console.example.com/oauth/callback"
        {:ok, %Oidcc.Token{}}
      end)

      {:ok, _} = OAuth.retrieve_token(%{code: "code"})
      refute OAuth.client_assertion?()
      refute Map.has_key?(OAuth.provider_quirks(), :document_overrides)
    end

    test "it sends a signed jwt-bearer client assertion if a private key is configured" do
      configure(client_secret: "ignored", client_private_key: private_key(), client_key_id: "thumbprint")

      expect(Oidcc.ProviderConfiguration.Worker, :get_provider_configuration, fn _ ->
        %Oidcc.ProviderConfiguration{token_endpoint: @token_url}
      end)

      expect(Oidcc, :retrieve_token, fn "code", _, @client_id, :unauthenticated, opts ->
        assert opts.preferred_auth_methods == [:none]
        body = Map.new(opts.body_extension)
        assert body["client_assertion_type"] == "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"

        {:ok, claims} = Joken.peek_claims(body["client_assertion"])
        assert claims["iss"] == @client_id
        assert claims["sub"] == @client_id
        assert claims["aud"] == @token_url

        {:ok, header} = Joken.peek_header(body["client_assertion"])
        assert header["kid"] == "thumbprint"
        assert header["x5t"] == "thumbprint"
        {:ok, %Oidcc.Token{}}
      end)

      {:ok, _} = OAuth.retrieve_token(%{code: "code"})
      assert OAuth.provider_quirks().document_overrides == %{"token_endpoint_auth_methods_supported" => ["none"]}
    end

    test "it can override the client assertion audience" do
      configure(client_private_key: private_key(), client_assertion_audience: "https://idp.example.com")

      expect(Oidcc, :retrieve_token, fn _, _, _, :unauthenticated, opts ->
        {:ok, claims} = Joken.peek_claims(Map.new(opts.body_extension)["client_assertion"])
        assert claims["aud"] == "https://idp.example.com"
        {:ok, %Oidcc.Token{}}
      end)

      {:ok, _} = OAuth.retrieve_token(%{code: "code"})
    end
  end

  defp configure(conf) do
    Application.put_env(:console, :oidc_providers, plural: Keyword.merge([
      discovery_document_uri: "https://idp.example.com/.well-known/openid-configuration",
      client_id: @client_id,
      redirect_uri: "https://console.example.com/oauth/callback",
      scope: "openid email"
    ], conf))
  end

  defp private_key() do
    {:ok, key} = ExPublicKey.generate_key()
    {:ok, pem} = ExPublicKey.pem_encode(key)
    pem
  end

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

    test "loads userinfo without a client secret when using client assertions" do
      configure(client_private_key: private_key(), client_assertion_audience: "https://idp.example.com", userinfo: true)
      token = id_token()

      expect(Oidcc, :retrieve_token, fn "code", _, @client_id, :unauthenticated, _ -> {:ok, token} end)
      expect(Oidcc, :retrieve_userinfo, fn ^token, _, @client_id, :unauthenticated, %{} ->
        {:ok, %{"groups" => ["org/platform"]}}
      end)

      assert {:ok, %{"groups" => ["org/platform"]}} = OAuth.retrieve_claims(%{code: "code"})
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
