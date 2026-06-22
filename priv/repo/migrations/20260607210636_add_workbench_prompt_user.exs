defmodule Console.Repo.Migrations.AddWorkbenchPromptUser do
  use Ecto.Migration

  def change do
    alter table(:workbench_job_activities) do
      add :user_id, references(:watchman_users, type: :uuid, on_delete: :nilify_all)
    end

    create index(:workbench_job_activities, [:user_id])
  end
end
