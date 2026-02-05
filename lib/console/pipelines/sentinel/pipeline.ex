defmodule Console.Pipelines.Sentinel.Pipeline do
  use Console.Pipelines.Consumer
  alias Console.Deployments.Sentinels
  require Logger

  def handle_event(sentinel) do
    Logger.info "handling sentinel #{sentinel.id}"
    with {:ok, run} <- Sentinels.run_sentinel(sentinel) do
      Logger.info("sentinel #{sentinel.id} run #{run.id} created")
    else
      err -> Logger.info("sentinel #{sentinel.id} run creation failed: #{inspect(err)}")
    end
  end
end
