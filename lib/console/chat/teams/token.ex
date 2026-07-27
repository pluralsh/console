defmodule Console.Chat.Teams.Token do
  @moduledoc """
  Mints and caches a Bot Framework connector token (to-channel-from-bot) used to authenticate outbound replies
  posted to a conversation `serviceUrl`.  This is distinct from the Microsoft Graph token minted for the
  workbench teams tools - it is scoped to `https://api.botframework.com/.default`.

  Note: single-tenant bots authenticate against their tenant authority (what we do here).  Multi-tenant bots
  should instead use the `botframework.com` authority; adjust the stored tenant id accordingly if needed.
  """
  import OAuth2.Util, only: [unix_now: 0]
  alias Console.Cache
  alias OAuth2.{Client, Strategy.ClientCredentials}

  @scope "https://api.botframework.com/.default"

  @spec connector_token(binary, binary, binary) :: {:ok, binary} | {:error, binary}
  def connector_token(client_id, client_secret, tenant_id)
      when is_binary(client_id) and is_binary(client_secret) and is_binary(tenant_id) do
    case Cache.get(cache_key(client_id, tenant_id)) do
      %OAuth2.AccessToken{access_token: token} when is_binary(token) -> {:ok, token}
      _ -> refresh(client_id, client_secret, tenant_id)
    end
  end
  def connector_token(_, _, _), do: {:error, "Microsoft Teams app registration is not configured"}

  defp refresh(client_id, client_secret, tenant_id) do
    client_base(client_id, client_secret, tenant_id)
    |> Client.get_token()
    |> case do
      {:ok, %Client{token: %OAuth2.AccessToken{access_token: token, expires_at: expires_at} = at}} ->
        Cache.put(cache_key(client_id, tenant_id), at, ttl: expiry(expires_at))
        {:ok, token}
      {:error, err} -> {:error, "failed to exchange teams connector token: #{inspect(err)}"}
    end
  end

  defp client_base(client_id, client_secret, tenant_id) do
    Client.new(
      strategy: ClientCredentials,
      site: "https://api.botframework.com",
      client_id: client_id,
      client_secret: client_secret,
      scope: @scope,
      token_url: "https://login.microsoftonline.com/#{tenant_id}/oauth2/v2.0/token"
    )
  end

  defp cache_key(client_id, tenant_id), do: {:teams_connector_token, tenant_id, client_id}

  defp expiry(expires_at) when is_integer(expires_at), do: expires_at - unix_now()
  defp expiry(_), do: :timer.minutes(15)
end
