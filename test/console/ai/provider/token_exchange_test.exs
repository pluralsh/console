defmodule Console.AI.Provider.TokenExchangeTest do
  @moduledoc false
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Provider
  alias Console.AI.Provider.TokenExchange
  alias Console.AI.Provider.TokenExchange.Response
  alias Console.Schema.DeploymentSettings.OauthToken

  @token_url "https://example.com/oauth2/token"
  @client_id "test-client-id"
  @client_secret "test-client-secret"

  setup do
    prev = Application.get_env(:oauth2, :adapter)
    Application.put_env(:oauth2, :adapter, Tesla.Mock)

    on_exit(fn ->
      if prev do
        Application.put_env(:oauth2, :adapter, prev)
      else
        Application.delete_env(:oauth2, :adapter)
      end
    end)

    :ok
  end

  describe "exchange/3" do
    test "POSTs client_credentials to the token URL with Basic auth and parses JSON token response" do
      stub(Console.Cache, :get, fn _ -> nil end)

      Tesla.Mock.mock(fn env ->
        assert env.method == :post
        assert env.url == @token_url

        assert URI.decode_query(env.body) == %{"grant_type" => "client_credentials"}

        assert header(env.headers, "authorization") ==
                 "Basic " <> Base.encode64(@client_id <> ":" <> @client_secret)

        assert header(env.headers, "content-type") |> String.starts_with?("application/x-www-form-urlencoded")
        assert header(env.headers, "accept") == "application/json"

        %Tesla.Env{
          status: 200,
          headers: [{"content-type", "application/json; charset=utf-8"}],
          body:
            Jason.encode!(%{
              "access_token" => "access-token-value",
              "token_type" => "Bearer",
              "expires_in" => 3600
            })
        }
      end)

      expect(Console.Cache, :put, fn key, at, _opts ->
        assert key == {:token_exchange, @token_url, @client_id, @client_secret}
        assert %OAuth2.AccessToken{access_token: "access-token-value"} = at
        :ok
      end)

      assert {:ok, %OAuth2.AccessToken{access_token: "access-token-value"}} =
               TokenExchange.exchange(@token_url, @client_id, @client_secret)
    end

    test "accepts application/x-www-form-urlencoded token responses" do
      stub(Console.Cache, :get, fn _ -> nil end)

      Tesla.Mock.mock(fn env ->
        assert env.url == @token_url

        %Tesla.Env{
          status: 200,
          headers: [{"content-type", "application/x-www-form-urlencoded"}],
          body:
            URI.encode_query(%{
              "access_token" => "form-body-token",
              "token_type" => "Bearer",
              "expires_in" => "3600"
            })
        }
      end)

      stub(Console.Cache, :put, fn _, _, _ -> :ok end)

      assert {:ok, %OAuth2.AccessToken{access_token: "form-body-token"}} =
               TokenExchange.exchange(@token_url, @client_id, @client_secret)
    end

    test "returns a cached bearer token without issuing an HTTP request" do
      cached = %OAuth2.AccessToken{
        access_token: "from-cache",
        expires_at: nil,
        refresh_token: nil,
        token_type: "Bearer",
        other_params: %{}
      }

      stub(Console.Cache, :get, fn _ -> cached end)

      Tesla.Mock.mock(fn _ ->
        flunk("token endpoint should not be called when the token is cached")
      end)

      assert {:ok, "from-cache"} =
               TokenExchange.exchange(@token_url, @client_id, @client_secret)
    end

    test "OpenAI completion end-to-end: OAuth token exchange then ReqLLM receives api_key" do
      oauth_access_token = "oauth-access-token-for-reqllm"

      stub(Console.Cache, :get, fn _ -> nil end)

      Tesla.Mock.mock(fn env ->
        assert env.method == :post
        assert env.url == @token_url
        assert URI.decode_query(env.body) == %{"grant_type" => "client_credentials"}

        assert header(env.headers, "authorization") ==
                 "Basic " <> Base.encode64(@client_id <> ":" <> @client_secret)

        assert header(env.headers, "content-type") |> String.starts_with?("application/x-www-form-urlencoded")
        assert header(env.headers, "accept") == "application/json"

        %Tesla.Env{
          status: 200,
          headers: [{"content-type", "application/json"}],
          body:
            Jason.encode!(%{
              "access_token" => oauth_access_token,
              "token_type" => "Bearer",
              "expires_in" => 3600
            })
        }
      end)

      expect(Console.Cache, :put, fn key, %OAuth2.AccessToken{access_token: ^oauth_access_token}, _opts ->
        assert {:token_exchange, :client_secret, @token_url, @client_id, _, nil, nil, nil} =
                 key

        :ok
      end)

      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{
            model: "gpt-5.4-mini",
            token_exchange: %{
              enabled: true,
              token_url: @token_url,
              client_id: @client_id,
              client_secret: @client_secret
            }
          }
        }
      )

      expect(ReqLLM, :generate_text, fn %{provider: :openai, model: "gpt-5.4-mini"}, _messages, opts ->
        assert Keyword.get(opts, :api_key) == oauth_access_token

        openai_response()
      end)

      assert {:ok, "ok"} = Provider.completion([{:user, "ping"}], preface: :ignore)
    end

    test "OpenAI completion uses cached OAuth token from deployment settings" do
      oauth_access_token = "cached-oauth-access-token-for-reqllm"

      stub(Console.Cache, :get, fn _ ->
        %OAuth2.AccessToken{
          access_token: oauth_access_token,
          expires_at: nil,
          refresh_token: nil,
          token_type: "Bearer",
          other_params: %{}
        }
      end)

      Tesla.Mock.mock(fn _ ->
        flunk("token endpoint should not be called when the token is cached")
      end)

      deployment_settings(
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{
            model: "gpt-5.4-mini",
            token_exchange: %{
              enabled: true,
              token_url: @token_url,
              client_id: @client_id,
              client_secret: @client_secret
            }
          }
        }
      )

      expect(ReqLLM, :generate_text, fn %{provider: :openai, model: "gpt-5.4-mini"}, _messages, opts ->
        assert Keyword.get(opts, :api_key) == oauth_access_token

        openai_response()
      end)

      assert {:ok, "ok"} = Provider.completion([{:user, "ping"}], preface: :ignore)
    end
  end

  describe "client assertions" do
    test "decodes JSON token responses from content type parameters" do
      response = %Req.Response{
        headers: %{"content-type" => ["application/oauth-token+json; charset=utf-8"]},
        body: Jason.encode!(%{"access_token" => "decoded-token"})
      }

      assert {:ok, %{"access_token" => "decoded-token"}} =
               Response.decode_response(response)
    end

    test "signs an RS256 assertion with the required OAuth claims" do
      {:ok, private_key} = ExPublicKey.generate_key()
      {:ok, private_key} = ExPublicKey.pem_encode(private_key)

      assert {:ok, assertion} =
               TokenExchange.Assertion.mint(
                 @client_id,
                 @token_url <> "/",
                 private_key,
                 "signing-key"
               )

      assert {:ok,
              %{
                "iss" => @client_id,
                "sub" => @client_id,
                "aud" => audience,
                "jti" => jti,
                "exp" => exp,
                "iat" => iat
              }} = Joken.peek_claims(assertion)

      assert audience == @token_url <> "/"
      assert is_binary(jti)
      assert exp - iat == 300
    end

    test "exchanges a signed assertion with resource and caches the token" do
      {:ok, private_key} = ExPublicKey.generate_key()
      {:ok, private_key} = ExPublicKey.pem_encode(private_key)

      config = %OauthToken{
        enabled: true,
        type: :client_assertion,
        token_url: @token_url,
        client_id: @client_id,
        private_key: private_key,
        audience: @token_url <> "/",
        resource: "jira-resource"
      }

      stub(Console.Cache, :get, fn _ -> nil end)
      stub(Console.Cache, :put, fn _, _, _ -> :ok end)

      expect(Req, :post, fn @token_url, opts ->
        form = Map.new(opts[:form])
        assert header(opts[:headers], "accept") ==
                 "application/json, application/x-www-form-urlencoded"

        assert opts[:decode_body] == false
        assert form.client_id == @client_id
        assert form.grant_type == "client_credentials"
        assert form.resource == "jira-resource"
        assert form.client_assertion_type =~ "jwt-bearer"
        assert {:ok, %{"aud" => audience}} = Joken.peek_claims(form.client_assertion)
        assert audience == @token_url <> "/"

        {:ok,
         %Req.Response{
           status: 200,
           headers: %{"content-type" => ["text/plain; charset=utf-8"]},
           body:
             Jason.encode!(%{
               "access_token" => "assertion-access-token",
               "token_type" => "Bearer",
               "expires_in" => 3600
             })
         }}
      end)

      assert {:ok, %OAuth2.AccessToken{access_token: "assertion-access-token"}} =
               TokenExchange.exchange(config)
    end

    test "decodes a form-encoded assertion token response from its content type" do
      {:ok, private_key} = ExPublicKey.generate_key()
      {:ok, private_key} = ExPublicKey.pem_encode(private_key)

      config = %OauthToken{
        enabled: true,
        type: :client_assertion,
        token_url: @token_url,
        client_id: @client_id,
        private_key: private_key
      }

      stub(Console.Cache, :get, fn _ -> nil end)
      stub(Console.Cache, :put, fn _, _, _ -> :ok end)

      expect(Req, :post, fn @token_url, _opts ->
        {:ok,
         %Req.Response{
           status: 200,
           headers: %{"content-type" => ["application/x-www-form-urlencoded"]},
           body:
             URI.encode_query(%{
               "access_token" => "form-assertion-token",
               "token_type" => "Bearer",
               "expires_in" => "3600"
             })
         }}
      end)

      assert {:ok, %OAuth2.AccessToken{access_token: "form-assertion-token"}} =
               TokenExchange.exchange(config)
    end

    test "requires credentials selected by token exchange type" do
      {:ok, private_key} = ExPublicKey.generate_key()
      {:ok, private_key} = ExPublicKey.pem_encode(private_key)

      secret_changeset =
        OauthToken.changeset(%OauthToken{}, %{
          token_url: @token_url,
          client_id: @client_id,
          client_secret: @client_secret
        })

      assertion_changeset =
        OauthToken.changeset(%OauthToken{}, %{
          type: :client_assertion,
          token_url: @token_url,
          client_id: @client_id,
          private_key: private_key
        })

      assert secret_changeset.valid?
      assert assertion_changeset.valid?
    end
  end

  defp header(headers, wanted) do
    wanted = String.downcase(wanted)

    Enum.find_value(headers, fn {k, v} ->
      if String.downcase(to_string(k)) == wanted, do: v
    end)
  end

  defp openai_response do
    Jason.encode!(%{
      "id" => "resp_e2e",
      "object" => "response",
      "output" => [
        %{
          "type" => "message",
          "id" => "msg_e2e",
          "status" => "completed",
          "role" => "assistant",
          "content" => [%{"type" => "output_text", "text" => "ok"}]
        }
      ]
    })
    |> ReqLLM.Response.decode_response("openai:gpt-5.4-mini")
  end
end
