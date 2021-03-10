defmodule Watchman.Forge.Subscription do
  alias Watchman.Forge.Queries

  def handle_response(:incident_message, msg), do: IO.inspect(msg)

  def subscribe() do
    do_subscribe(:incident_message, Queries.incident_message_subscription())
  end

  defp do_subscribe(name, query, variables \\ []) do
    AbsintheWebSocket.SubscriptionServer.subscribe(
      __MODULE__.SubscriptionServer,
      name,
      &handle_response(name, &1),
      query,
      variables
    )
  end

  def supervisor() do
    token = Watchman.Forge.Config.derive_config()
    {AbsintheWebSocket.Supervisor,
      [
        subscriber: __MODULE__,
        url: "wss://forge.piazza.app/socket/websocket",
        token: token,
        base_name: __MODULE__,
        async: true
      ]}
  end
end
