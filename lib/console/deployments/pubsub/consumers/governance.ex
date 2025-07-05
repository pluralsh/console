defmodule Console.Deployments.PubSub.Governance do
  use Piazza.PubSub.Consumer,
    broadcaster: Console.PubSub.Broadcaster,
    max_demand: 10
  alias Console.Deployments.PubSub.Governable
  require Logger

  def handle_event(event) do
    case Governable.reconcile(event) do
      :ok ->
        Logger.info "Reconciled governance for event #{event.__struct__}"
        :ok

      {:error, _} = err ->
        Logger.error "Error reconciling governance for event #{event.__struct__}: #{inspect(err)}"
        err
    end
  end
end
