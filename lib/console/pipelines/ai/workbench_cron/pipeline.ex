defmodule Console.Pipelines.AI.WorkbenchCron.Pipeline do
  use Console.Pipelines.Consumer
  alias Console.Repo
  alias Console.Schema.{WorkbenchCron, Workbench}
  alias Console.Deployments.Workbenches
  alias Console.Services.Users
  require Logger

  def handle_event(%WorkbenchCron{prompt: p} = cron) do
    mark_last_run(cron)
    case Repo.preload(cron, [:workbench]) do
      %WorkbenchCron{workbench: %Workbench{} = workbench} ->
        Workbenches.create_workbench_job(%{prompt: p}, workbench.id, bot())
      _ -> :ok
    end
  end

  defp bot(), do: %{Users.get_bot!("console") | roles: %{admin: true}}

  defp mark_last_run(%WorkbenchCron{} = cron) do
    cron
    |> WorkbenchCron.changeset(%{last_run_at: DateTime.utc_now()})
    |> Repo.update()
  end
end
