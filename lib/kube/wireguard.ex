defmodule Kube.WireguardPeer do
  use Kazan.Model

  defmodule Status do
    use Kazan.Model
    alias Kazan.Apis.Core.V1, as: CoreV1

    defmodel "WireguardPeerStatus", "vpn.plural.sh", "v1alpha1" do
      property :config_ref, "configRef",  CoreV1.SecretKeySelector
      property :ready,      "ready",      :boolean
      property :conditions, "conditions", {:array, Kube.Application.Condition}
    end
  end

  defmodule Spec do
    use Kazan.Model

    defmodel  "WireguardPeerSpec", "vpn.plural.sh", "v1alpha1" do
      property :wireguard_ref,"wireguardRef", :string
    end
  end

  defmodel "WireguardPeer", "vpn.plural.sh", "v1alpha1" do
    property :spec, "spec", Spec
    property :status, "status", Status
  end
end

defmodule Kube.WireguardPeerList do
  use Kazan.Model

  defmodellist "WireguardPeerList",
               "vpn.plural.sh",
               "v1alpha1",
               Kube.WireguardPeer
end


defmodule Kube.WireguardServer do
  use Kazan.Model

  defmodule Status do
    use Kazan.Model

    defmodel  "WireguardServerStatus", "vpn.plural.sh", "v1alpha1" do
      property :ready,      "ready", :boolean
      property :conditions, "conditions", {:array, Kube.Application.Condition}
    end
  end

  defmodel "WireguardServer", "vpn.plural.sh", "v1alpha1" do
    property :status, "status", Status
  end
end

defmodule Kube.WireguardServerList do
  use Kazan.Model

  defmodellist "WireguardServerList",
               "vpn.plural.sh",
               "v1alpha1",
               Kube.WireguardServer
end
