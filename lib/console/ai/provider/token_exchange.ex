defmodule Console.AI.Provider.TokenExchange do
  @moduledoc """
  Manages a client credentials oauth2 handshake to acquire an auth token for an ai model.  Caches the result based on published expires_at
  """
  import OAuth2.Util
  alias Console.Cache
  alias OAuth2.{Client, Strategy.ClientCredentials}

  @serializers %{
    "application/json" => Jason,
    "application/x-www-form-urlencoded" => Console.AI.Provider.TokenExchange.FormURLEncoded
  }

  @spec exchange(binary, binary, binary) :: {:ok, binary} | {:error, binary}
  def exchange(url, client_id, client_secret) do
    cache_key(url, client_id, client_secret)
    |> Cache.get()
    |> case do
      %OAuth2.AccessToken{access_token: token} -> {:ok, token}
      _ -> refresh_token(url, client_id, client_secret)
    end
  end

  defp refresh_token(url, client_id, client_secret) do
    with {:ok, site, token_url} <- parse_url(url) do
      Client.new(
        strategy: ClientCredentials,
        client_id: client_id,
        client_secret: client_secret,
        site: site,
        token_url: token_url,
        serializers: @serializers
      )
      |> Client.get_token()
      |> case do
        {:ok, %Client{token: %OAuth2.AccessToken{expires_at: expires_at} = at}} ->
          cache_key(url, client_id, client_secret)
          |> Console.Cache.put(at, ttl: expiry(expires_at))
          {:ok, at}
        {:error, err} -> {:error, "Failed to exchange token: #{inspect(err)}"}
      end
    end
  end

  defp cache_key(url, client_id, client_secret), do: {:token_exchange, url, client_id, client_secret}

  defp parse_url(url) do
    case URI.parse(url) do
      %URI{path: path} = uri -> {:ok, URI.to_string(%{uri | path: ""}), path}
      _ -> {:error, "invalid url: #{url}"}
    end
  end

  defp expiry(expires_at) when is_integer(expires_at), do: expires_at - unix_now()
  defp expiry(_), do: :timer.minutes(15)
end
