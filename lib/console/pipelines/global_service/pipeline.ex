defmodule Console.Pipelines.GlobalService.Pipeline do
  use Flow
  require Logger
  alias Console.Deployments.Global

  def start_link(producer) do
    Flow.from_stages([producer], stages: 15, max_demand: 2)
    |> Flow.map(fn global ->
      Logger.info "Syncing global service #{global.id}"
      Global.sync_clusters(global)
    end)
    |> Flow.start_link()
  end
end
