defmodule Console.Repo.Migrations.AddWbVerificationFields do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :stack_run_id, references(:stack_runs, type: :uuid, on_delete: :nothing)
    end

    create index(:pull_requests, [:stack_run_id])

    create table(:queued_prompts, primary_key: false) do
      add :id,               :uuid, primary_key: true
      add :prompt,           :binary
      add :user_id,          references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :workbench_job_id, references(:workbench_jobs, type: :uuid, on_delete: :delete_all)
      add :dequeable_at,     :utc_datetime_usec
      add :consumed_at,      :utc_datetime_usec

      timestamps()
    end

    create index(:queued_prompts, [:user_id])
    create index(:queued_prompts, [:workbench_job_id])
    create index(:queued_prompts, [:dequeable_at])
  end
end
