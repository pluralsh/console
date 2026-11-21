defmodule Console.PubSub.Consumers.Rtc do
  use Console.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 100,
    protocol: Console.PubSub.Rtc
  alias Console.PubSub.Rtc

  # each event runs in its own task, so a devbox's live deltas (message chunks a client applies by offset) would
  # race each other; `Console.Devboxes.Ingest` publishes those itself, in order
  def select?(%Console.PubSub.DevboxInstanceDeltaCreated{}), do: false
  def select?(event), do: implemented(@proto, @any_proto, event)

  def handle_event(event) do
    with {resource, delta} <- Rtc.deliver(event) do
      topic = Console.GraphQl.Topic.infer(resource, delta)
      Absinthe.Subscription.publish(
        ConsoleWeb.Endpoint,
        %{payload: resource, delta: delta},
        topic
      )
    end
  end
end
