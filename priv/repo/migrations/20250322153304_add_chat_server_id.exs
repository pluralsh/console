defmodule Console.Repo.Migrations.AddChatServerId do
  use Ecto.Migration

  def change do
    alter table(:chats) do
      add :confirm,   :boolean, default: false
      add :server_id, references(:mcp_servers, type: :uuid, on_delete: :nilify_all)
    end
  end
end
