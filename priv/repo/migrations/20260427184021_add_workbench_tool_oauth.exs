defmodule Console.Repo.Migrations.AddWorkbenchToolOauth do
  use Ecto.Migration

  def change do
    create table(:workbench_oauth_clients, primary_key: false) do
      add :id,                     :uuid, primary_key: true
      add :tool,                   :integer
      add :issuer,                 :string
      add :authorization_url,      :string
      add :client_id,              :string
      add :client_secret,          :string
      add :provider_configuration, :map

      timestamps()
    end

    create unique_index(:workbench_oauth_clients, [:tool])

    alter table(:workbench_tools) do
      add :oauth_token, :map
    end

    alter table(:workbench_jobs) do
      add :type, :integer, default: 0
      add :referenced_job_id, references(:workbench_jobs, type: :uuid, on_delete: :nilify_all)
    end

    create index(:workbench_jobs, [:referenced_job_id])
  end
end
