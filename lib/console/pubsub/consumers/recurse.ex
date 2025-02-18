defmodule Console.PubSub.Consumers.Recurse do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 75
  alias Console.PubSub.Recurse


  def handle_event(event), do: Recurse.process(event)
end
