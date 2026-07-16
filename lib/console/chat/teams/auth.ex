defmodule Console.Chat.Teams.Auth do
  @moduledoc """
  Validates inbound Bot Framework JWTs sent by the Azure Bot Service (channel -> bot).

  Follows the Bot Connector authentication spec:
  https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication

  It fetches (and caches) the connector OpenID metadata + JWKS, then validates the issuer, audience (the bot's
  Microsoft App ID), lifetime and RS256 signature.  When a `:service_url` opt is supplied it is also checked
  against the `serviceurl` claim, since a valid token pins the service url the reply may be sent to.
  """
  alias Console.Cache
  require Logger

  @issuer "https://api.botframework.com"
  @metadata_url "https://login.botframework.com/v1/.well-known/openidconfiguration"
  @clock_skew 300
  @ttl :timer.hours(24)

  @type claims :: map()

  @spec verify(binary, binary, keyword) :: {:ok, claims} | {:error, binary}
  def verify(token, audience, opts \\ []) when is_binary(token) and is_binary(audience) do
    with {:ok, header}  <- Joken.peek_header(token),
         {:ok, jwk}     <- signing_key(header),
         {:ok, claims}  <- verify_signature(jwk, header, token),
         :ok            <- validate_claims(claims, audience, opts) do
      {:ok, claims}
    end
  end
  def verify(_, _, _), do: {:error, "missing teams bot token or audience"}

  defp verify_signature(jwk, %{"alg" => alg}, token) when is_binary(alg) do
    case JOSE.JWT.verify_strict(JOSE.JWK.from_map(jwk), [alg], token) do
      {true, %JOSE.JWT{fields: claims}, _} -> {:ok, claims}
      _ -> {:error, "invalid teams jwt signature"}
    end
  end
  defp verify_signature(_, _, _), do: {:error, "teams jwt is missing a signing algorithm"}

  defp validate_claims(claims, audience, opts) do
    now = System.system_time(:second)
    with :ok <- check(claims["iss"] == @issuer, "invalid teams jwt issuer"),
         :ok <- check(claims["aud"] == audience, "invalid teams jwt audience"),
         :ok <- check(is_integer(claims["exp"]) and claims["exp"] + @clock_skew > now, "teams jwt expired"),
         :ok <- check(!is_integer(claims["nbf"]) or claims["nbf"] - @clock_skew <= now, "teams jwt not yet valid"),
         :ok <- validate_service_url(claims, opts[:service_url]) do
      :ok
    end
  end

  defp validate_service_url(_claims, url) when not is_binary(url), do: :ok
  defp validate_service_url(%{"serviceurl" => claim}, url) when is_binary(claim),
    do: check(String.trim_trailing(claim, "/") == String.trim_trailing(url, "/"), "teams jwt serviceUrl mismatch")
  defp validate_service_url(_claims, _url), do: :ok

  defp signing_key(%{"kid" => kid}) do
    case Enum.find(signing_keys(), & &1["kid"] == kid) do
      %{} = key -> {:ok, key}
      _ -> {:error, "no matching signing key for teams jwt"}
    end
  end
  defp signing_key(_), do: {:error, "teams jwt is missing a key id"}

  defp signing_keys() do
    case Cache.get(:teams_bf_jwks) do
      [_ | _] = keys -> keys
      _ -> refresh_keys()
    end
  end

  defp refresh_keys() do
    with {:ok, %{"jwks_uri" => uri}} <- fetch(@metadata_url),
         {:ok, %{"keys" => keys}}    <- fetch(uri) do
      Cache.put(:teams_bf_jwks, keys, ttl: @ttl)
      keys
    else
      err ->
        Logger.warning("failed to fetch teams bot framework jwks: #{inspect(err)}")
        []
    end
  end

  defp fetch(url) do
    case Req.get(url) do
      {:ok, %Req.Response{status: 200, body: body}} when is_map(body) -> {:ok, body}
      err -> {:error, err}
    end
  end

  defp check(true, _), do: :ok
  defp check(_, msg), do: {:error, msg}
end
