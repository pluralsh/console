defmodule Console.Pipelines.Sentinel.Pipeline do
  use Console.Pipelines.Consumer
  alias Console.Repo
  alias Console.Deployments.Sentinel.Runner
  require Logger

  @timeout :timer.seconds(120)

  def handle_event(run) do
    Logger.info "handling sentinel run #{run.id}"
    with {:ok, run} <- mark_polled(run),
         {:ok, pid} <- Runner.start(run),
         :ok <- Console.await(pid, @timeout) do
      Logger.info("sentinel run #{run.id} finished")
    else
      err -> Logger.info("sentinel run #{run.id} failed: #{inspect(err)}")
    end
  end

  defp mark_polled(run) do
    run
    |> Ecto.Changeset.change(%{polled_at: DateTime.utc_now()})
    |> Repo.update()
  end
end
