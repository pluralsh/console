defmodule Console.Services.VPN do
  use Console.Services.Base
  alias Console.Schema.User
  alias Kube.{WireguardPeer, WireguardServer, WireguardPeerList}
  alias Kazan.Apis.Core.V1, as: CoreV1
  alias Console.Cached.VPN, as: VPNCache
  alias Kube.Client

  @type error :: {:error, term}
  @type peer_resp :: {:ok, WireguardPeer.t} | error
  @type server_resp :: {:ok, WireguardServer.t} | error

  def enabled?() do
    case Console.conf(:initialize) do
      true -> server_installed?()
      _ -> false
    end
  end

  @spec get_server() :: server_resp
  def get_server() do
    Console.namespace("wireguard")
    |> Client.get_wireguard_server("wireguard")
  end

  @spec list_peers() :: {:ok, WireguardPeerList.t} | error
  def list_peers() do
    Console.namespace("wireguard")
    |> Client.list_wireguard_peers()
  end

  @spec list_peers(User.t) :: {:ok, WireguardPeerList.t} | error
  def list_peers(%User{email: email}),
    do: Client.list_peers_for_user(email)

  @spec accessible(WireguardPeer.t, User.t) :: peer_resp
  def accessible(peer, %User{roles: %{admin: true}}), do: {:ok, peer}
  def accessible(%WireguardPeer{metadata: %{annotations: %{"vpn.plural.sh/email" => e}}} = peer, %User{email: e}),
    do: {:ok, peer}
  def accessible(_, _), do: {:error, "cannot access this wireguard peer"}

  @spec get_peer(binary, User.t) :: peer_resp
  def get_peer(name, %User{} = user) do
    Console.namespace("wireguard")
    |> Client.get_wireguard_peer(name)
    |> when_ok(&accessible(&1, user))
  end

  @spec config(WireguardPeer.t) :: {:ok, binary} | error
  def config(%WireguardPeer{
    metadata: %{namespace: ns},
    status: %WireguardPeer.Status{
      ready: true,
      config_ref: %WireguardPeer.Status.ConfigRef{key: k, name: n}
    }
  }) do
    CoreV1.read_namespaced_secret!(ns, n)
    |> Kazan.run()
    |> case do
      {:ok, %CoreV1.Secret{data: %{^k => value}}} -> Base.decode64(value)
      _ -> {:error, "could not find config secret"}
    end
  end
  def config(_), do: {:error, "wireguard peer not yet ready"}

  @spec create_peer(User.t | binary, binary) :: peer_resp
  def create_peer(email, name) when is_binary(email) do
    case server_installed?() do
      true -> Client.create_wireguard_peer(email, name)
      _ -> {:error, "cannot create wireguard peers without a wireguard server setup"}
    end
  end
  def create_peer(%User{email: email}, name), do: create_peer(email, name)

  @spec delete_peer(binary) :: peer_resp
  def delete_peer(name), do: Client.delete_wireguard_peer(name)

  defp server_installed?() do
    case VPNCache.get("wireguard") do
      %WireguardServer{} -> true
      _ -> false
    end
  end
end
