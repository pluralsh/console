defmodule Console.Deployments.PubSub.Governance do
  use Console.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 100,
    protocol: Console.Deployments.PubSub.Governable
  alias Console.Deployments.PubSub.Governable
  require Logger

  def handle_event(event) do
    case Governable.reconcile(event) do
      {:error, _} = err ->
        Logger.error "Error reconciling governance for event #{event.__struct__}: #{inspect(err)}"
        err

      _ -> :ok
    end
  end
end
