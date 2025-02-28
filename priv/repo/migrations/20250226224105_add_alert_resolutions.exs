defmodule Console.Repo.Migrations.AddAlertResolutions do
  use Ecto.Migration

  def change do
    create table(:alert_resolutions, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :alert_id,   references(:alerts, type: :uuid, on_delete: :delete_all)
      add :resolution, :binary

      timestamps()
    end

    create unique_index(:alert_resolutions, [:alert_id])
  end
end
