defmodule Console.Pipelines.Sentinel.Pipeline do
  use Console.Pipelines.Consumer
  alias Console.Deployments.Sentinel.Runner
  require Logger

  @timeout :timer.seconds(120)

  def handle_event(run) do
    with {:ok, pid} = Runner.start(run) do
      case Console.await(pid, @timeout) do
        :ok -> Logger.info("sentinel run #{run.id} finished")
        :timeout -> Logger.info("sentinel run #{run.id} timed out")
      end
    end
  end
end
