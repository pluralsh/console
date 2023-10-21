defmodule Console.Deployments.PubSub.Broadcast do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.Deployments.PubSub.Broadcastable


  def handle_event(event) do
    with {room, event, data} <- Broadcastable.message(event) do
      Phoenix.Channel.Server.broadcast(Console.PubSub, room, event, data)
    end
  end
end
