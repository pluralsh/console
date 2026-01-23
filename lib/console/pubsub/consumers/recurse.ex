defmodule Console.PubSub.Consumers.Recurse do
  use Console.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 200,
    protocol: Console.PubSub.Recurse
  alias Console.PubSub.Recurse


  def handle_event(event), do: Recurse.process(event)
end
