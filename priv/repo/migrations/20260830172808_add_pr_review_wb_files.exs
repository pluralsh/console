defmodule Console.Repo.Migrations.AddPrReviewWbFiles do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :review_comment_id, :string
      add :workbench_id,      references(:workbenches, type: :uuid, on_delete: :nilify_all)
    end

    create index(:pull_requests, [:workbench_id])

    create table(:workbench_files, primary_key: false) do
      add :id, :uuid, primary_key: true

      add :filename,         :string
      add :digest,           :string
      add :workbench_id,     references(:workbenches, type: :uuid, on_delete: :nothing)
      add :workbench_job_id, references(:workbench_jobs, type: :uuid, on_delete: :nothing)

      timestamps()
    end

    create index(:workbench_files, [:workbench_id])
    create index(:workbench_files, [:workbench_job_id])

    alter table(:agent_runs) do
      add :review_depth, :integer, default: 1
    end
  end
end
