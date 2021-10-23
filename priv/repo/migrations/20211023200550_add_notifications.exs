defmodule Console.Repo.Migrations.AddNotifications do
  use Ecto.Migration

  def change do
    create table(:notifications, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :title,       :string
      add :description, :string
      add :repository,  :string
      add :labels,      :map
      add :annotations, :map
      add :fingerprint,  :string
      add :seen_at,     :utc_datetime_usec

      timestamps()
    end

    create unique_index(:notifications, [:fingerprint])
    create index(:notifications, [:seen_at])
  end
end
