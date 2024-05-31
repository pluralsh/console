defmodule Console.Repo.Migrations.AddDeploymentSettingsStacks do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :stacks, :map
    end

    create table(:service_imports, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)
      add :stack_id, references(:stacks, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:service_imports, [:service_id])
  end
end
