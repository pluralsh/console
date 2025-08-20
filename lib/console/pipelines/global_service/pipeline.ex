defmodule Console.Pipelines.GlobalService.Pipeline do
  use Console.Pipelines.Consumer
  require Logger
  alias Console.Deployments.Global

  def handle_event(global) do
    Logger.info "Syncing global service #{global.id}"
    Global.next_poll(global)
    Global.sync_clusters(global)
  end
end
