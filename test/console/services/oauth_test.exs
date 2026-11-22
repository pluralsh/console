defmodule Console.Services.OAuthTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Services.OAuth

  @client_id "console"
  @token_url "https://idp.example.com/oauth2/token"

  # trimmed from a PingFederate discovery document that advertises an optional PAR endpoint
  @ping_discovery %{
    "issuer" => "https://authn-qa.example.com",
    "authorization_endpoint" => "https://authn-qa.example.com/as/authorization.oauth2",
    "token_endpoint" => "https://authn-qa.example.com/as/token.oauth2",
    "userinfo_endpoint" => "https://authn-qa.example.com/idp/userinfo.openid",
    "jwks_uri" => "https://authn-qa.example.com/pf/JWKS",
    "pushed_authorization_request_endpoint" => "https://authn-qa.example.com/as/par.oauth2",
    "scopes_supported" => ["openid", "profile"],
    "response_types_supported" => ["code", "token", "id_token"],
    "grant_types_supported" => ["implicit", "authorization_code", "refresh_token", "client_credentials"],
    "subject_types_supported" => ["public", "pairwise"],
    "id_token_signing_alg_values_supported" => ["RS256", "ES256"],
    "token_endpoint_auth_methods_supported" => ["client_secret_basic", "client_secret_post", "client_secret_jwt", "private_key_jwt", "tls_client_auth", "none"],
    "token_endpoint_auth_signing_alg_values_supported" => ["RS256", "PS256", "HS256"],
    "request_parameter_supported" => true,
    "request_object_signing_alg_values_supported" => ["RS256", "ES256", "PS256"],
    "code_challenge_methods_supported" => ["plain", "S256"],
    "dpop_signing_alg_values_supported" => ["RS256", "ES256"]
  }

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

  describe "#redirect_uri/1" do
    test "it uses the authorization endpoint if pushed authorization requests are optional" do
      configure(client_secret: "secret")
      ctx = client_context(%{"require_pushed_authorization_requests" => false}, "secret")
      expect(Oidcc.ClientContext, :from_configuration_worker, fn _, @client_id, "secret" -> {:ok, ctx} end)

      uri = URI.parse(OAuth.redirect_uri(nil))
      assert "#{uri.scheme}://#{uri.host}#{uri.path}" == "https://authn-qa.example.com/as/authorization.oauth2"

      query = URI.decode_query(uri.query)
      refute query["request_uri"]
      assert query["client_id"] == @client_id
      assert query["response_type"] == "code"
      assert query["redirect_uri"] == "https://console.example.com/oauth/callback"
      assert query["scope"] == "openid email"
    end

    test "it still pushes the authorization request if the provider requires it" do
      configure(client_secret: "secret")
      ctx = client_context(%{"require_pushed_authorization_requests" => true}, "secret")
      expect(Oidcc.ClientContext, :from_configuration_worker, fn _, _, _ -> {:ok, ctx} end)
      expect(Oidcc.Authorization, :create_redirect_url, fn passed, _ ->
        assert passed.provider_configuration.pushed_authorization_request_endpoint == "https://authn-qa.example.com/as/par.oauth2"
        {:ok, "https://authn-qa.example.com/as/authorization.oauth2?request_uri=urn"}
      end)

      assert OAuth.redirect_uri(nil) =~ "request_uri"
    end
  end

  describe "auth methods" do
    test "oidcc defaults to an hmac client assertion against providers advertising client_secret_jwt" do
      %{provider_configuration: conf} = ctx = client_context(%{}, "secret")

      {:ok, {body, _}, method} = :oidcc_auth_util.add_client_authentication(
        [],
        [],
        conf.token_endpoint_auth_methods_supported,
        conf.token_endpoint_auth_signing_alg_values_supported,
        %{},
        Oidcc.ClientContext.struct_to_record(ctx)
      )

      assert method == :client_secret_jwt
      assert Map.new(body)["client_assertion_type"] == "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"

      {:ok, {body, _}, :none} = :oidcc_auth_util.add_client_authentication(
        [],
        [],
        conf.token_endpoint_auth_methods_supported,
        conf.token_endpoint_auth_signing_alg_values_supported,
        %{preferred_auth_methods: [:none]},
        Oidcc.ClientContext.struct_to_record(client_context(%{}, :unauthenticated))
      )

      assert body == [{"client_id", @client_id}]
    end

    test "it authenticates as a public client with the none auth method" do
      configure(client_secret: "secret", auth_method: "none")

      expect(Oidcc, :retrieve_token, fn "code", _, @client_id, :unauthenticated, opts ->
        assert opts.preferred_auth_methods == [:none]
        refute Map.has_key?(opts, :body_extension)
        {:ok, %Oidcc.Token{}}
      end)

      {:ok, _} = OAuth.retrieve_token(%{code: "code"})
    end

    test "it pins secret based auth methods" do
      configure(client_secret: "secret", auth_method: "client_secret_basic")

      expect(Oidcc, :retrieve_token, fn _, _, @client_id, "secret", opts ->
        assert opts.preferred_auth_methods == [:client_secret_basic]
        {:ok, %Oidcc.Token{}}
      end)

      {:ok, _} = OAuth.retrieve_token(%{code: "code"})
    end

    test "it pins the auth method for pushed authorization requests" do
      configure(client_secret: "secret", auth_method: "none")
      ctx = client_context(%{"require_pushed_authorization_requests" => true}, :unauthenticated)
      expect(Oidcc.ClientContext, :from_configuration_worker, fn _, _, :unauthenticated -> {:ok, ctx} end)
      expect(Oidcc.Authorization, :create_redirect_url, fn _, opts ->
        assert opts.preferred_auth_methods == [:none]
        {:ok, "https://authn-qa.example.com/as/authorization.oauth2?request_uri=urn"}
      end)

      OAuth.redirect_uri(nil)
    end

    test "it rejects unsupported auth methods" do
      configure(auth_method: "private_key")
      assert_raise ArgumentError, fn -> OAuth.auth_method() end
    end
  end

  defp client_context(overrides, secret) do
    {:ok, conf} =
      @ping_discovery
      |> Map.merge(overrides)
      |> Oidcc.ProviderConfiguration.decode_configuration()

    Oidcc.ClientContext.from_manual(conf, JOSE.JWK.from_map(%{"keys" => []}), @client_id, secret)
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
