defmodule Console.Pipelines.Observer.Pipeline do
  use Console.Pipelines.Consumer
  require Logger
  alias Console.Deployments.Observer.Runner

  def handle_event(observer) do
    Logger.info "Syncing observer #{observer.id}"
    Runner.run(observer)
  end
end
