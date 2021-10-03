defmodule Console.Repo.Migrations.Alertmanager do
  use Ecto.Migration

  def change do
    create table(:alertmanager_incidents, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :fingerprint, :string
      add :incident_id, :uuid

      timestamps()
    end

    create unique_index(:alertmanager_incidents, [:fingerprint])
    create unique_index(:alertmanager_incidents, [:incident_id])
  end
end
