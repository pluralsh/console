defmodule Console.Deployments.PubSub.Preview do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 100
  alias Console.Deployments.PubSub.Previewable
  require Logger

  def handle_event(event) do
    case Previewable.reconcile(event) do
      {:ok, _} = result -> result
      {:error, _} = err ->
        Logger.error "Error reconciling preview for event #{event.__struct__}: #{inspect(err)}"
        err
      _ -> :ok
    end
  end
end
