defmodule Console.Repo.Migrations.AddPullRequestWorkbenchId do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :workbench_job_id, references(:workbench_jobs, type: :uuid, on_delete: :nilify_all)
    end

    create index(:pull_requests, [:workbench_job_id])
  end
end
