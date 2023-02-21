defmodule Console.Cached.VPN do
  @moduledoc """
  This genserver will query and poll all pods then cache them in-memory.  This is to accelerate pod lookups since
  it's pretty damn slow currently
  """
  use Console.Cached.Base
  import Kube.Client.Base, only: [path_builder: 4]
  alias Kube.{WireguardServer, WireguardServerList}

  def start_link(), do: Console.Cached.Kubernetes.start_link(__MODULE__, vpn_request(), WireguardServer)

  def start(), do: Console.Cached.Kubernetes.start(__MODULE__, vpn_request(), WireguardServer)

  def fetch(), do: Console.Cached.Kubernetes.fetch(__MODULE__)

  def get(key), do: Console.Cached.Kubernetes.get(__MODULE__, key)

  defp vpn_request() do
    %Kazan.Request{
      method: "get",
      path: path_builder("vpn.plural.sh", "v1alpha1", "wireguardservers", Console.namespace("wireguard")),
      body: "",
      query_params: %{},
      content_type: "application/json",
      response_model: WireguardServerList
    }
  end
end
