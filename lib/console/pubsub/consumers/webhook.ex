defmodule Console.PubSub.Consumers.Webhook do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  require Logger
  alias Console.Services.Webhooks

  def handle_event(event) do
    with {:ok, {build, webhook_query}} <- Console.PubSub.Webhook.deliver(event) do
      Logger.info "Delivering webhooks"

      webhook_query
      |> Console.Repo.stream(method: :keyset)
      |> Flow.from_enumerable()
      |> Flow.map(&Webhooks.deliver(build, &1))
      |> Flow.map(fn
        {:ok, wh} -> wh
        {:error, error} ->
          Logger.error "Failed to deliver webhook properly: #{inspect(error)}"
          nil
      end)
      |> Flow.run()
    end
  end
end
