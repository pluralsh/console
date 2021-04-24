defmodule Console.PubSub.Consumers.Rtc do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.PubSub.Rtc


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
