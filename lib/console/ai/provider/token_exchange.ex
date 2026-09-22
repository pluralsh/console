defmodule Console.AI.Provider.TokenExchange do
  @moduledoc """
  Exchanges OAuth2 client credentials for access tokens using a client secret
  or an RS256-signed JWT client assertion. Tokens are cached until expires_at.
  """
  import OAuth2.Util
  alias Console.Cache
  alias Console.AI.Provider.TokenExchange.{Assertion, Response}
  alias Console.Schema.DeploymentSettings.OauthToken
  alias OAuth2.{Client, Strategy.ClientCredentials}

  @assertion_type "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
  @token_response_types "application/json, application/x-www-form-urlencoded"

  @serializers %{
    "application/json" => Jason,
    "application/x-www-form-urlencoded" => Console.AI.Provider.TokenExchange.FormURLEncoded
  }

  @spec exchange(binary, binary, binary) ::
          {:ok, binary | OAuth2.AccessToken.t()} | {:error, binary}
  def exchange(url, client_id, client_secret) do
    cache_key(url, client_id, client_secret)
    |> Cache.get()
    |> case do
      %OAuth2.AccessToken{access_token: token} -> {:ok, token}
      _ -> refresh_token(url, client_id, client_secret)
    end
  end

  @spec exchange(OauthToken.t()) :: {:ok, binary | OAuth2.AccessToken.t()} | {:error, binary}
  def exchange(%OauthToken{} = config) do
    config
    |> cache_key()
    |> Cache.get()
    |> case do
      %OAuth2.AccessToken{access_token: token} -> {:ok, token}
      _ -> refresh_token(config)
    end
  end

  @spec authorization_header(OauthToken.t()) ::
          {:ok, {binary, binary}} | {:error, binary}
  def authorization_header(%OauthToken{} = config) do
    case exchange(config) do
      {:ok, %OAuth2.AccessToken{access_token: token}} when is_binary(token) ->
        {:ok, {"Authorization", "Bearer #{token}"}}

      {:ok, token} when is_binary(token) ->
        {:ok, {"Authorization", "Bearer #{token}"}}

      error ->
        error
    end
  end

  defp refresh_token(url, client_id, client_secret) do
    refresh_token(url, client_id, client_secret, cache_key(url, client_id, client_secret))
  end

  defp refresh_token(url, client_id, client_secret, key, params \\ []) do
    with {:ok, site, token_url} <- parse_url(url) do
      Client.new(
        strategy: ClientCredentials,
        client_id: client_id,
        client_secret: client_secret,
        site: site,
        token_url: token_url,
        serializers: @serializers
      )
      |> Client.get_token(params)
      |> case do
        {:ok, %Client{token: %OAuth2.AccessToken{expires_at: expires_at} = at}} ->
          Console.Cache.put(key, at, ttl: expiry(expires_at))
          {:ok, at}

        {:error, err} -> {:error, "Failed to exchange token: #{inspect(err)}"}
      end
    end
  end

  defp refresh_token(%OauthToken{type: :client_assertion} = config) do
    audience = config.audience || config.token_url

    with {:ok, assertion} <-
           Assertion.mint(
             config.client_id,
             audience,
             config.private_key,
             config.key_id
           ),
         {:ok, response} <- request_assertion_token(config, assertion),
         {:ok, token} <- access_token(response) do
      Cache.put(cache_key(config), token, ttl: expiry(token.expires_at))
      {:ok, token}
    else
      {:error, err} -> {:error, "Failed to exchange token: #{inspect(err)}"}
    end
  end

  defp refresh_token(%OauthToken{} = config) do
    params =
      []
      |> maybe_put(:resource, config.resource)
      |> maybe_put(:scope, scopes(config.scopes))

    refresh_token(
      config.token_url,
      config.client_id,
      config.client_secret,
      cache_key(config),
      params
    )
  end

  defp request_assertion_token(config, assertion) do
    form =
      [
        grant_type: "client_credentials",
        client_id: config.client_id,
        client_assertion_type: @assertion_type,
        client_assertion: assertion
      ]
      |> maybe_put(:resource, config.resource)
      |> maybe_put(:scope, scopes(config.scopes))

    case Req.post(config.token_url,
           form: form,
           headers: [{"accept", @token_response_types}],
           decode_body: false,
           retry: false
         ) do
      {:ok, %Req.Response{status: status} = response} when status in 200..299 ->
        Response.decode_response(response)

      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, "token endpoint returned #{status}: #{inspect(body)}"}

      {:error, _} = error ->
        error
    end
  end

  defp access_token(body) when is_map(body) do
    access_token = body["access_token"] || body[:access_token]
    token_type = body["token_type"] || body[:token_type] || "Bearer"
    expires_in = body["expires_in"] || body[:expires_in]

    if is_binary(access_token) do
      {:ok,
       %OAuth2.AccessToken{
         access_token: access_token,
         token_type: token_type,
         expires_at: expires_at(expires_in),
         refresh_token: body["refresh_token"] || body[:refresh_token],
         other_params:
           Map.drop(
             body,
             ~w(access_token token_type expires_in refresh_token)a ++
               ~w(access_token token_type expires_in refresh_token)
           )
       }}
    else
      {:error, "token response did not include access_token"}
    end
  end

  defp access_token(_), do: {:error, "invalid token response"}

  defp cache_key(url, client_id, client_secret), do: {:token_exchange, url, client_id, client_secret}

  defp cache_key(%OauthToken{} = config) do
    credential = config.client_secret || config.private_key

    {:token_exchange, config.type, config.token_url, config.client_id,
     :crypto.hash(:sha256, credential || ""), config.audience, config.resource, config.scopes}
  end

  defp parse_url(url) do
    case URI.parse(url) do
      %URI{path: path} = uri -> {:ok, URI.to_string(%{uri | path: ""}), path}
      _ -> {:error, "invalid url: #{url}"}
    end
  end

  defp expiry(expires_at) when is_integer(expires_at), do: expires_at - unix_now()
  defp expiry(_), do: :timer.minutes(15)

  defp expires_at(value) when is_integer(value), do: unix_now() + value

  defp expires_at(value) when is_binary(value) do
    case Integer.parse(value) do
      {seconds, ""} -> unix_now() + seconds
      _ -> nil
    end
  end

  defp expires_at(_), do: nil

  defp maybe_put(form, _key, nil), do: form
  defp maybe_put(form, _key, ""), do: form
  defp maybe_put(form, key, value), do: Keyword.put(form, key, value)

  defp scopes(scopes) when is_list(scopes), do: Enum.join(scopes, " ")
  defp scopes(_), do: nil
end
