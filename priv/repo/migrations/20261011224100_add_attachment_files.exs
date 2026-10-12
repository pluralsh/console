defmodule Console.Repo.Migrations.AddAttachmentFiles do
  use Ecto.Migration

  def change do
    create table(:attachments, primary_key: false) do
      add :id, :uuid, primary_key: true

      add :filename, :string
      add :filetype, :string
      add :path,     :string, null: false
      add :size,     :bigint

      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all), null: false
      add :workbench_job_id, references(:workbench_jobs, type: :uuid, on_delete: :delete_all)
      add :workbench_job_activity_id, references(:workbench_job_activities, type: :uuid, on_delete: :delete_all)
      add :queued_prompt_id, references(:queued_prompts, type: :uuid, on_delete: :nilify_all)
      add :agent_prompt_id, references(:agent_prompts, type: :uuid, on_delete: :delete_all)
      add :agent_run_id, references(:agent_runs, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:attachments, [:workbench_id])
    create index(:attachments, [:workbench_job_id])
    create index(:attachments, [:workbench_job_activity_id])
    create index(:attachments, [:queued_prompt_id])
    create index(:attachments, [:agent_prompt_id])
    create index(:attachments, [:agent_run_id])
  end
end
