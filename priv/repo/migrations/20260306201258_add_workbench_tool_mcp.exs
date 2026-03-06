defmodule Console.Repo.Migrations.AddWorkbenchToolMcp do
  use Ecto.Migration

  def change do
    alter table(:workbench_tools) do
      add :mcp_server_id, references(:mcp_servers, type: :uuid, on_delete: :delete_all)
    end

    create index(:workbench_tools, [:mcp_server_id])

    alter table(:mcp_servers) do
      add :protocol, :integer, default: 0
    end

  end
end
