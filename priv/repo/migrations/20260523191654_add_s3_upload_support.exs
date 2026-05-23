defmodule Console.Repo.Migrations.AddS3UploadSupport do
  use Ecto.Migration

  def change do
    create table(:agent_run_uploads, primary_key: false) do
      add :id,               :uuid, primary_key: true
      add :agent_run_id,     references(:agent_runs, type: :uuid, on_delete: :delete_all), null: false
      add :session,          :string
      add :screen_recording, :string
      add :patch,            :string

      timestamps()
    end

    create index(:agent_run_uploads, [:agent_run_id])

    alter table(:workbenches) do
      add :memory, :string
    end
  end
end
