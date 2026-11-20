defmodule ConsoleWeb.GraphqlWSSocket do
  use Absinthe.GraphqlWS.Socket,
    schema: Console.GraphQl
  alias Console.Schema.User
  alias Console.Services.Users

  # 5s graphql-ws text-frame ping interval (see comment on ExternalGraphqlWSSocket below)
  @gql_ping_interval 5_000

  @impl Absinthe.GraphqlWS.Socket
  def handle_init(params, socket) do
    with {:ok, token} <- fetch_token(params),
         {:ok, current_user} <- resolve_user(token) do
      :timer.send_interval(@gql_ping_interval, :gql_ws_keepalive)
      # subscriptions authorize every delivery against this user, so its groups must be loaded up front
      current_user = Console.Services.Rbac.preload(current_user)
      {:ok, %{name: current_user.email}, assign_context(socket, current_user: current_user)}
    else
      _ -> {:error, %{}, socket}
    end
  end

  # graphql-ws text-frame ping - see ExternalGraphqlWSSocket below for rationale
  @impl Absinthe.GraphqlWS.Socket
  def handle_message(:gql_ws_keepalive, socket),
    do: {:push, {:text, ~s({"type":"ping"})}, socket}
  def handle_message(_message, socket), do: {:ok, socket}

  def fetch_token(%{"Authorization" => "Bearer " <> token}), do: {:ok, token}
  def fetch_token(%{"Authorization" => "Token " <> token}), do: {:ok, token}
  def fetch_token(%{"token" => "Bearer " <> token}), do: {:ok, token}
  def fetch_token(%{"token" => "Token " <> token}), do: {:ok, token}
  def fetch_token(%{"token" => token}), do: {:ok, token}
  def fetch_token(_), do: {:error, :notoken}

  defp resolve_user("console-" <> _ = token) do
    case Users.get_by_token(token) do
      %User{} = user -> {:ok, user}
      _ -> {:error, :unauthorized}
    end
  end

  defp resolve_user(token) do
    case Console.Guardian.resource_from_token(token) do
      {:ok, %User{} = user, _claims} -> {:ok, user}
      _ -> {:error, :unauthorized}
    end
  end
end

defmodule ConsoleWeb.ExternalGraphqlWSSocket do
  use Absinthe.GraphqlWS.Socket,
    schema: Console.ExternalGraphQl
  alias Console.Schema.Cluster
  alias Console.Deployments.Clusters

  # 5s graphql-ws text-frame ping interval.
  #
  # The library's built-in keepalive sends RFC 6455 control-frame pings (opcode 0x09).
  # Nginx and cloud load-balancers treat WS control frames as protocol overhead and do
  # NOT count them toward their idle-timeout counters — only TEXT/BINARY data frames do.
  # This causes the proxy to close idle connections after its configured timeout (default
  # 60 s for nginx), producing the observed ~61 s reconnect cycle even though the library
  # keepalive is active.
  #
  # graphql-ws {"type":"ping"} messages are TEXT frames. go-graphql-client handles them
  # via GQLPing and responds with {"type":"pong"} (also a TEXT frame), so real data flows
  # in both directions every 5 s and the proxy idle timer never fires.
  @gql_ping_interval 5_000

  @impl Absinthe.GraphqlWS.Socket
  def handle_init(params, socket) do
    with {:ok, token} <- fetch_token(params),
         %Cluster{} = cluster <- Clusters.get_by_deploy_token(token) do
      :timer.send_interval(@gql_ping_interval, :gql_ws_keepalive)
      {:ok, %{name: cluster.handle}, assign_context(socket, cluster: cluster)}
    else
      _ -> {:error, %{}, socket}
    end
  end

  @impl Absinthe.GraphqlWS.Socket
  def handle_message(:gql_ws_keepalive, socket),
    do: {:push, {:text, ~s({"type":"ping"})}, socket}
  def handle_message(_message, socket), do: {:ok, socket}

  def fetch_token(%{"Authorization" => "Bearer " <> token}), do: {:ok, token}
  def fetch_token(%{"token" => "Bearer " <> token}), do: {:ok, token}
  def fetch_token(%{"token" => token}), do: {:ok, token}
  def fetch_token(_), do: {:error, :notoken}
end
