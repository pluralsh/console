defmodule Console.AI.Tools.Workbench.Integration.Teams.TokenExchange do
  @moduledoc """
  Manages a client credentials oauth2 handshake to acquire an auth token for an ai model.  Caches the result based on published expires_at
  """
  import Console.Services.Base, only: [when_ok: 2]
  import OAuth2.Util
  alias Console.Cache
  alias OAuth2.{Client, Strategy.ClientCredentials}

  @spec exchange(binary, binary, binary) :: {:ok, binary} | {:error, binary}
  def exchange(client_id, client_secret, tenant_id) do
    cache_key(tenant_id, client_id, client_secret)
    |> Cache.get()
    |> case do
      %OAuth2.AccessToken{access_token: token} -> {:ok, token}
      _ -> refresh_token(client_id, client_secret, tenant_id)
    end
    |> when_ok(fn token ->
      client_base(client_id, client_secret, tenant_id)
      |> build_client(token)
    end)
  end

  defp refresh_token(client_id, client_secret, tenant_id) do
    client_base(client_id, client_secret, tenant_id)
    |> Client.get_token()
    |> case do
      {:ok, %Client{token: %OAuth2.AccessToken{expires_at: expires_at} = at}} ->
        cache_key(tenant_id, client_id, client_secret)
        |> Console.Cache.put(at, ttl: expiry(expires_at))
        {:ok, at}
      {:error, err} -> {:error, "Failed to exchange token: #{inspect(err)}"}
    end
  end

  defp client_base(client_id, client_secret, tenant_id) do
    Client.new(
      strategy: ClientCredentials,
      site: "https://graph.microsoft.com",
      client_id: client_id,
      client_secret: client_secret,
      scope: "https://graph.microsoft.com/.default",
      token_url: "https://login.microsoftonline.com/#{tenant_id}/oauth2/v2.0/token"
    )
  end

  defp build_client(%Client{} = client, token) when is_binary(token) do
    %Client{client | token: %OAuth2.AccessToken{access_token: token}}
    |> Client.put_header("content-type", "application/json;odata.metadata=minimal;odata.streaming=true;IEEE754Compatible=false")
  end

  defp cache_key(tenant_id, client_id, client_secret), do: {:teams_token, tenant_id, client_id, client_secret}

  defp expiry(expires_at) when is_integer(expires_at), do: expires_at - unix_now()
  defp expiry(_), do: :timer.minutes(15)
end
