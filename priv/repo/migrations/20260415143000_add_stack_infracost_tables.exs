defmodule Console.Repo.Migrations.AddStackInfracostTables do
  use Ecto.Migration

  def change do
    create table(:stack_infracost_resources, primary_key: false) do
      add :id, :uuid, primary_key: true

      add :stack_id,       references(:stacks, type: :uuid, on_delete: :delete_all), null: false
      add :stack_run_id,   references(:stack_runs, type: :uuid, on_delete: :delete_all), null: false
      add :stack_state_id, references(:stack_states, type: :uuid, on_delete: :nilify_all)

      add :resource_scope, :string, null: false
      add :project_name,   :string
      add :name,           :string, null: false
      add :resource_type,  :string

      add :hourly_cost,         :numeric, precision: 24, scale: 10
      add :monthly_cost,        :numeric, precision: 24, scale: 10
      add :monthly_usage_cost,  :numeric, precision: 24, scale: 10

      add :raw_resource, :map

      timestamps()
    end

    create index(:stack_infracost_resources, [:stack_run_id])
    create index(:stack_infracost_resources, [:stack_id, :inserted_at])
    create index(:stack_infracost_resources, [:stack_run_id, :resource_scope])
    create index(:stack_infracost_resources, [:resource_type])
  end
end
