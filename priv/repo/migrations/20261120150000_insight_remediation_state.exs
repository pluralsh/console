defmodule Console.Repo.Migrations.InsightRemediationState do
  use Ecto.Migration

  def change do
    alter table(:ai_insights) do
      add :remediated_sha, :string
      add :remediated_at, :utc_datetime_usec
      add :remediation_job_id, references(:workbench_jobs, type: :uuid, on_delete: :nilify_all)
    end

    drop_if_exists index(:workbench_jobs, [:cluster_id, :component_key, :inserted_at])

    alter table(:workbench_jobs) do
      remove :component_key, :text
      remove :insight_sha, :text
    end

    create index(:workbench_jobs, [:cluster_id, :inserted_at])
  end
end
