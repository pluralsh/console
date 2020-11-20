defmodule Watchman.PubSub.Consumers.Rtc do
  use Piazza.PubSub.Consumer,
    broadcaster: Watchman.PubSub.Broadcaster,
    max_demand: 10
  alias Watchman.PubSub.Rtc


  def handle_event(event) do
    with {resource, delta} <- Rtc.deliver(event) do
      topic = Watchman.GraphQl.Topic.infer(resource, delta)
      Absinthe.Subscription.publish(
        WatchmanWeb.Endpoint,
        %{payload: resource, delta: delta},
        topic
      )
    end
  end
end