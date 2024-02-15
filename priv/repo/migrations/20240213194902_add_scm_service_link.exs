defmodule Console.Repo.Migrations.AddScmServiceLink do
  use Ecto.Migration

  def change do
    create table(:dependency_management_services, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)
      add :connection_id, references(:scm_connections, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:dependency_management_services, [:connection_id])
  end
end
