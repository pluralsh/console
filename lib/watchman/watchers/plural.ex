defmodule Watchman.Watchers.Plural do
  use Watchman.Watchers.Base, state: [:absinthe]
  alias PhoenixClient.{Socket, Channel, Message}
  alias Watchman.Plural.Queries
  alias Watchman.Watchers.Handlers

  @socket_name Application.get_env(:watchman, :socket)

  def worker() do
    token = Watchman.Plural.Config.derive_config()
    socket_opts = [
      url: "wss://app.plural.sh/socket/websocket",
      params: %{token: token}
    ]

    {PhoenixClient.Socket, {socket_opts, [name: @socket_name, id: @socket_name]}}
  end

  def handle_info(:start, state) do
    Logger.info "starting graphql watcher"
    Process.send_after(self(), :connect, 1000)

    {:noreply, state}
  end

  def handle_info(:connect, state) do
    with {:ok, _, absinthe} <- Channel.join(@socket_name, "__absinthe__:control"),
         :ok <- subscribe(absinthe, Queries.incident_message_subscription()) do
      {:noreply, %{state | absinthe: absinthe}}
    else
      error ->
        Logger.error "Failed to join rooms: #{inspect(error)}"
        Process.send_after(self(), :connect, 1000)
        {:noreply, state}
    end
  end

  def handle_info(
    %Message{
      event: "subscription:data",
      payload: %{
        "result" => %{
          "data" => %{
            "incidentMessageDelta" => %{
              "delta" => "CREATE", "payload" => msg
            }
          }
        }
      }
    },
    state
  ) do
    Handlers.SlashCommand.handle(msg)
    {:noreply, state}
  end

  def handle_info(%Message{event: "phx_error", payload: %{reason: {:remote, :closed}}}, state) do
    Logger.info "Remote closed, reconnecting"
    Process.send_after(self(), :connect, 1000)
    {:noreply, state}
  end

  def handle_info(msg, state) do
    IO.inspect(msg)
    {:noreply, state}
  end

  defp subscribe(absinthe, query, variables \\ %{}) do
    with {:ok, %{"subscriptionId" => id}} <- Channel.push(absinthe, "doc", %{query: query, variables: variables}),
      do: Socket.listen(@socket_name, id, self())
  end
end
