defmodule ConsoleWeb.AIChannel do
  use ConsoleWeb, :channel
  alias Console.Schema.User

  @stream_event "stream"

  def stream(topic, payload), do: ConsoleWeb.Endpoint.broadcast(topic, @stream_event, payload)

  def join("ai:" <> rest, _, socket) do
    send(self(), {:connect_ai, String.split(rest, ":")})
    {:ok, socket}
  end

  def handle_info({:connect_ai, [_, _, user_id]}, %{assigns: %{user: %User{id: user_id}}} = socket),
    do: {:noreply, socket}
  def handle_info(_, socket), do: {:stop, {:error, :unauthorized}, socket}
end
