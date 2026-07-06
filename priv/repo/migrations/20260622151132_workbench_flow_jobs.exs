defmodule Console.Repo.Migrations.WorkbenchFlowJobs do
  use Ecto.Migration

  def change do
    alter table(:workbench_jobs) do
      add :flow_id, references(:flows, type: :uuid, on_delete: :nilify_all)
    end

    create index(:workbench_jobs, [:flow_id])
  end
end
