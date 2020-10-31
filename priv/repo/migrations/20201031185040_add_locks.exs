defmodule Watchman.Repo.Migrations.AddLocks do
  use Ecto.Migration

  def change do
    create table(:locks, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :name,       :string, null: false
      add :holder,     :uuid
      add :expires_at, :utc_datetime_usec

      timestamps()
    end

    create unique_index(:locks, [:name])
  end
end
