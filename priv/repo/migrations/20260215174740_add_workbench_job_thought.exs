defmodule Console.Repo.Migrations.AddWorkbenchJobThought do
  use Ecto.Migration

  def change do
    create table(:workbench_job_thoughts, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :activity_id, references(:workbench_job_activities, type: :uuid, on_delete: :delete_all)
      add :content,     :binary
      add :attributes,  :map

      timestamps()
    end

    create index(:workbench_job_thoughts, [:activity_id])
  end
end
