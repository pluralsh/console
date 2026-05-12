defmodule Console.Repo.Migrations.AddMonitors do
  use Ecto.Migration

  def change do
    create table(:monitors, primary_key: false) do
      add :id,                  :uuid, primary_key: true
      add :name,                :string
      add :description,         :string
      add :alert_template,      :binary
      add :severity,            :integer, default: 0
      add :type,                :integer, default: 0
      add :query,               :map
      add :threshold,           :map
      add :evaluation_cron,     :string
      add :next_run_at,         :utc_datetime_usec
      add :last_run_at,         :utc_datetime_usec

      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :nilify_all)
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:monitors, [:service_id])
    create index(:monitors, [:next_run_at])
    create index(:monitors, [:workbench_id])

    alter table(:alerts) do
      add :monitor_id, references(:monitors, type: :uuid, on_delete: :nilify_all)
      add :timeseries, :map
    end

    create index(:alerts, [:monitor_id])
  end
end
