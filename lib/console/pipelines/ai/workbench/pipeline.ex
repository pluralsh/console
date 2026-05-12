defmodule Console.Pipelines.AI.Workbench.Pipeline do
  use Console.Pipelines.Consumer
  alias Console.Deployments.Workbenches
  alias Console.AI.Workbench.Engine
  require Logger

  def handle_event(job) do
    Logger.info("Handling workbench job #{job.id}")
    case exec_job(job) do
      {:ok, _} ->
        Logger.info("Workbench job #{job.id} completed")
      {:error, error} ->
        Logger.error("Workbench job #{job.id} failed: #{inspect(error)}")
    end
  end

  defp exec_job(job) do
    with {:ok, job} <- Workbenches.heartbeat(job),
         {:ok, engine} <- Engine.new(job),
      do: Engine.run(engine)
  end
end
