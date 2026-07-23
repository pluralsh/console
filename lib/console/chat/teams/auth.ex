defmodule Console.Chat.Teams.Auth do
  @moduledoc """
  Validates inbound Bot Framework JWTs sent by the Azure Bot Service (channel -> bot).

  Follows the Bot Connector authentication spec:
  https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication

  Teams authenticates channel -> bot webhooks with a signed OIDC JWT in the `Authorization` header - there is no
  hmac/shared-secret option like the scm/observability webhooks use - so we validate the token against the
  connector's published JWKS.  We reuse `oidcc` (as the OIDC login flow does in `Console.Deployments.Settings`)
  to discover the metadata, load + cache the JWKS, and validate the signature/issuer/audience/lifetime.  The
  Teams-specific `serviceurl` claim is checked separately.
  """
  alias Console.OIDC.ProviderConfiguration

  # The connector publishes its metadata here.  Two quirks are needed to consume it via oidcc:
  #   * the document's declared issuer is `https://api.botframework.com` (not this url) -> allow_issuer_mismatch
  #   * the document omits several oidc-required fields (scopes/response_types/subject_types), so we backfill
  #     them via document_overrides purely to satisfy the parser - they do not affect token validation.
  @config_issuer "https://login.botframework.com/v1"

  @quirks %{
    quirks: %{
      allow_issuer_mismatch: true,
      document_overrides: %{
        "scopes_supported" => ["openid"],
        "response_types_supported" => ["id_token"],
        "subject_types_supported" => ["public"]
      }
    }
  }

  @type claims :: map()

  @doc """
  Verifies a Bot Framework JWT.  `audience` must be the bot's Microsoft App ID (the connection's client id).
  Pass `service_url:` to additionally pin the token's `serviceurl` claim to the inbound activity's serviceUrl.
  """
  @spec verify(binary, binary, keyword) :: {:ok, claims} | {:error, binary}
  def verify(token, audience, opts \\ [])
  def verify(token, audience, opts) when is_binary(token) and is_binary(audience) do
    with {:ok, _}             <- peek(token),
         {:ok, {conf, jwks}}  <- ProviderConfiguration.fetch(@config_issuer, @quirks),
         ctx                  = Oidcc.ClientContext.from_manual(conf, jwks, audience, "dummy_secret", %{client_jwks: JOSE.JWK.generate_key(16)}),
         validate_opts        = %{signing_algs: ctx.provider_configuration.id_token_signing_alg_values_supported},
         {:ok, claims}        <- validate_jwt(token, ctx, validate_opts),
         :ok                  <- validate_service_url(claims, opts[:service_url]) do
      {:ok, claims}
    end
  end
  def verify(_, _, _), do: {:error, "missing teams bot token or audience"}

  # cheap, network-free rejection of obviously malformed tokens before we touch the provider config
  defp peek(token) do
    case Joken.peek_header(token) do
      {:ok, _} = ok -> ok
      _ -> {:error, "malformed teams jwt"}
    end
  end

  defp validate_jwt(token, ctx, opts) do
    case Oidcc.Token.validate_jwt(token, ctx, opts) do
      {:ok, claims} -> {:ok, claims}
      {:error, err} -> {:error, "invalid teams jwt: #{inspect(err)}"}
    end
  end

  # when no service_url is supplied there's nothing to pin against; otherwise the claim must be present and match.
  defp validate_service_url(_claims, url) when not is_binary(url), do: :ok
  defp validate_service_url(%{"serviceurl" => claim}, url) when is_binary(claim),
    do: check(String.trim_trailing(claim, "/") == String.trim_trailing(url, "/"), "teams jwt serviceUrl mismatch")
  defp validate_service_url(_claims, _url), do: {:error, "teams jwt is missing the serviceUrl claim"}

  defp check(true, _), do: :ok
  defp check(_, msg), do: {:error, msg}
end
