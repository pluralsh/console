defmodule Watchman.Repo.Migrations.AddAudits do
  use Ecto.Migration

  def change do
    alter table(:watchman_users) do
      add :bot_name, :string
    end

    create unique_index(:watchman_users, [:bot_name])

    create table(:changelog, primary_key: false) do
      add :id,       :uuid, primary_key: true
      add :build_id, references(:builds, type: :uuid, on_delete: :delete_all)
      add :repo,     :string
      add :tool,     :string
      add :content,  :binary

      timestamps()
    end

    create index(:changelog, [:build_id])
    create unique_index(:changelog, [:build_id, :repo, :tool])

    alter table(:builds) do
      add :creator_id, references(:watchman_users, type: :uuid, on_delete: :nothing)
    end

    create table(:audits, primary_key: false) do
      add :id,       :uuid, primary_key: true
      add :type,     :integer
      add :build_id, references(:builds, type: :uuid, on_delete: :delete_all)
      add :actor_id, references(:watchman_users, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:audits, [:build_id])
    create index(:audits, [:actor_id])
  end
end
