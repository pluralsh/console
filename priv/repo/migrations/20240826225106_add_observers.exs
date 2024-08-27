defmodule Console.Repo.Migrations.AddObservers do
  use Ecto.Migration
  alias Console.Deployments.Settings
  alias Console.Schema.PrAutomation

  def change do
    create table(:observers, primary_key: false) do
      add :id,             :uuid, primary_key: true
      add :name,           :string
      add :status,         :integer
      add :project_id,     references(:projects, type: :uuid, on_delete: :delete_all)
      add :target,         :map
      add :actions,        :map
      add :last_value,     :binary
      add :crontab,        :string
      add :last_run_at,    :utc_datetime_usec
      add :next_run_at,    :utc_datetime_usec

      timestamps()
    end

    create unique_index(:observers, [:name])
    create index(:observers, [:project_id])
    create index(:observers, [:next_run_at])

    alter table(:service_errors) do
      add :observer_id, references(:observers, type: :uuid, on_delete: :delete_all)
    end

    alter table(:pr_automations) do
      add :project_id, references(:projects, type: :uuid, on_delete: :delete_all)
    end

    create index(:pr_automations, [:project_id])

    flush()

    default = Settings.default_project!()
    Console.Repo.update_all(PrAutomation, set: [project_id: default.id])
  end
end
