defmodule Console.Deployments.PubSub.Notifications do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 100
  alias Console.Deployments.PubSub.Notifiable
  alias Console.Deployments.Notifications
  alias Console.Schema.{NotificationRouter}

  def handle_event(event) do
    with {event, filters, ctx} <- Notifiable.message(event) do
      NotificationRouter.for_event(event)
      |> NotificationRouter.preloaded([:sinks, :filters])
      |> NotificationRouter.ordered(asc: :id)
      |> NotificationRouter.for_filters(filters)
      |> Console.Repo.stream(method: :keyset)
      |> Flow.from_enumerable()
      |> Flow.map(&deliver(&1, event, ctx))
      |> Flow.run()
    end
  end

  defp deliver(%NotificationRouter{sinks: sinks}, event, ctx) do
    Enum.each(sinks, &Notifications.deliver(event, ctx, &1))
  end
end
