defmodule Console.Repo.Migrations.AddWorkbenchToolConnectionId do
  use Ecto.Migration

  def change do
    alter table(:workbench_tools) do
      add :scm_connection_id, references(:scm_connections, type: :uuid, on_delete: :nilify_all)
    end

    create index(:workbench_tools, [:scm_connection_id])
  end
end
