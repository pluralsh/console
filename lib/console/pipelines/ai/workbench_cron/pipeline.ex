defmodule Console.Pipelines.AI.WorkbenchCron.Pipeline do
  use Console.Pipelines.Consumer
  alias Console.Repo
  alias Console.Schema.{WorkbenchCron, Workbench, User}
  alias Console.Deployments.Workbenches
  require Logger

  def handle_event(%WorkbenchCron{prompt: p} = cron) do
    mark_last_run(cron)
    case Repo.preload(cron, [:workbench, user: [:groups]]) do
      %WorkbenchCron{workbench: %Workbench{} = workbench, user: %User{} = user} ->
        Workbenches.create_workbench_job(%{prompt: p}, workbench.id, user)
      _ -> :ok
    end
  end

  defp mark_last_run(%WorkbenchCron{} = cron) do
    cron
    |> WorkbenchCron.changeset(%{last_run_at: DateTime.utc_now()})
    |> Repo.update()
  end
end
