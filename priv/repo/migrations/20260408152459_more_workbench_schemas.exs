defmodule Console.Repo.Migrations.MoreWorkbenchSchemas do
  use Ecto.Migration

  def change do
    create table(:workbench_job_activity_agent_runs, primary_key: false) do
      add :id,                        :uuid, primary_key: true
      add :workbench_job_activity_id, references(:workbench_job_activities, type: :uuid, on_delete: :delete_all)
      add :agent_run_id,              references(:agent_runs, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:workbench_job_activity_agent_runs, [:workbench_job_activity_id, :agent_run_id])
    create index(:workbench_job_activity_agent_runs, [:workbench_job_activity_id])
    create index(:workbench_job_activity_agent_runs, [:agent_run_id])

    alter table(:alerts) do
      add :payload, :map
    end

    alter table(:issues) do
      add :payload, :map
    end
  end
end
