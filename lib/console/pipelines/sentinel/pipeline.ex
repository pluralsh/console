defmodule Console.Pipelines.Sentinel.Pipeline do
  use Console.Pipelines.Consumer
  alias Console.Deployments.Sentinel.Runner
  require Logger

  @timeout :timer.seconds(120)

  def handle_event(run) do
    {:ok, pid} = Runner.start(run)
    ref = Process.monitor(pid)

    receive do
      {:DOWN, ^ref, :process, ^pid, reason} ->
        Logger.info("sentinel run #{run.id} finished: #{inspect(reason)}")
    after
      @timeout ->
        Logger.info("sentinel run #{run.id} timed out")
    end
  end
end
