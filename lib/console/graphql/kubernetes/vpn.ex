defmodule Console.GraphQl.Kubernetes.VPN do
  use Console.GraphQl.Schema.Base
  import Console.GraphQl.Kubernetes.Base
  alias Console.GraphQl.Resolvers.UserLoader

  object :wireguard_peer do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:wireguard_peer_status)
    field :spec,     non_null(:wireguard_peer_spec)

    field :config, :string, resolve: fn
      peer, _, _ -> Console.Services.VPN.config(peer)
    end

    field :user, :user, resolve: fn
      %{metadata: %{annotations: %{"vpn.plural.sh/email" => email}}}, _, %{context: %{loader: loader}} when is_binary(email) ->
        loader
        |> Dataloader.load(UserLoader, :email, email)
        |> on_load(fn loader ->
          {:ok, Dataloader.get(loader, UserLoader, :email, email)}
        end)
      _, _, _ -> {:ok, nil}
    end

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end
  end

  object :wireguard_server do
    field :metadata, non_null(:metadata)
    field :status,   non_null(:wireguard_server_status)

    field :raw, non_null(:string), resolve: fn model, _, _ -> encode(model) end
  end

  object :wireguard_peer_status do
    field :ready,     :boolean
    field :conditions, list_of(:status_condition)
  end

  object :wireguard_peer_spec do
    field :wireguard_ref, :string
    field :address,       :string
    field :public_key,    :string
  end

  object :wireguard_server_status do
    field :ready,      :boolean
    field :conditions, list_of(:status_condition)
  end
end
