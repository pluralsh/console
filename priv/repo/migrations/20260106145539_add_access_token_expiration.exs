defmodule Console.Repo.Migrations.AddAccessTokenExpiration do
  use Ecto.Migration

  def change do
    alter table(:access_tokens) do
      add :expires_at, :utc_datetime_usec
    end

    create index(:access_tokens, [:expires_at])

    create table(:agent_run_repositories, primary_key: false) do
      add :id,  :uuid, primary_key: true
      add :url, :string, size: 2048
      add :last_used_at, :utc_datetime_usec

      timestamps()
    end

    create unique_index(:agent_run_repositories, [:url])
    create index(:agent_run_repositories, [:last_used_at])
  end
end
