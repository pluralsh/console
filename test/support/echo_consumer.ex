defmodule Console.EchoConsumer do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 20

  def handle_event(%{source_pid: pid} = event) do
    send(pid, {:event, event})
  end
end
