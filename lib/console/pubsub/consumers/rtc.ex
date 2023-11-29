defmodule Console.PubSub.Consumers.Rtc do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.PubSub.Rtc


  def handle_event(event) do
    case Rtc.deliver(event) do
      {resource, delta} ->
         topic = Console.GraphQl.Topic.infer(resource, delta)
         publish(resource, delta, topic)
      {resource, topics, delta} ->
        publish(resource, delta, topics)
      _ -> :ok
    end
  end

  defp publish(resource, delta, topic) do
    Absinthe.Subscription.publish(
      ConsoleWeb.Endpoint,
      %{payload: resource, delta: delta},
      topic
    )
  end
end
