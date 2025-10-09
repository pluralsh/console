defmodule Console.Repo.Migrations.AddSentinels do
  use Ecto.Migration

  def change do
    create table(:sentinels, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :project_id,    references(:projects, type: :uuid)
      add :name,          :string
      add :description,   :string
      add :checks,        :map
      add :repository_id, references(:git_repositories, type: :uuid)
      add :git,           :map

      timestamps()
    end

    create unique_index(:sentinels, [:name])
    create index(:sentinels, [:repository_id])
    create index(:sentinels, [:project_id])

    create table(:sentinel_runs, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :polled_at,     :utc_datetime_usec
      add :sentinel_id,   references(:sentinels, type: :uuid, on_delete: :delete_all)
      add :status,        :integer
      add :results,       :map

      timestamps()
    end

    create index(:sentinel_runs, [:sentinel_id])
  end
end
