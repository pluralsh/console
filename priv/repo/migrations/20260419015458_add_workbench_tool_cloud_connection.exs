defmodule Console.Repo.Migrations.AddWorkbenchToolCloudConnection do
  use Ecto.Migration

  def change do
    alter table(:workbench_tools) do
      add :cloud_connection_id, references(:cloud_connections, type: :uuid, on_delete: :delete_all)
    end

    create index(:workbench_tools, [:cloud_connection_id])
  end
end
