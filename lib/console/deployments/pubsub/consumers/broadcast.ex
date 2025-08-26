defmodule Console.Deployments.PubSub.Broadcast do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 100
  alias Console.Deployments.PubSub.Broadcastable


  def handle_event(event) do
    case Broadcastable.message(event) do
      {room, event, data} -> do_broadcast(room, event, data)
      [_ | _] = rooms -> Enum.each(rooms, fn {room, event, data} -> do_broadcast(room, event, data) end)
      pass -> pass
    end
  end

  defp do_broadcast(room, event, data) do
    Phoenix.Channel.Server.broadcast(Console.PubSub, room, event, data)
  end
end
