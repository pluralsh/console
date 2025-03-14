defmodule Console.Repo.Migrations.AddMcpServer do
  use Ecto.Migration

  def change do
    create table(:mcp_servers, primary_key: false) do
      add :id,             :uuid, primary_key: true
      add :name,           :string
      add :url,            :string
      add :capabilities,   :map
      add :authentication, :map
      add :confirm,        :boolean

      add :project_id,      references(:projects, type: :uuid)

      add :read_policy_id,  :uuid
      add :write_policy_id, :uuid

      timestamps()
    end

    create unique_index(:mcp_servers, [:name])

    create table(:mcp_server_audits, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :tool,      :string
      add :arguments, :map
      add :server_id, references(:mcp_servers, type: :uuid, on_delete: :nothing)
      add :actor_id,  references(:watchman_users, type: :uuid, on_delete: :nothing)

      timestamps()
    end

    create index(:mcp_server_audits, [:server_id])

    create table(:mcp_server_associations, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :flow_id,   references(:flows, type: :uuid, on_delete: :delete_all)
      add :server_id, references(:mcp_servers, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:mcp_server_associations, [:flow_id])
    create index(:mcp_server_associations, [:server_id])
    create unique_index(:mcp_server_associations, [:server_id, :flow_id])

    alter table(:chat_threads) do
      add :flow_id, references(:flows, type: :uuid, on_delete: :delete_all)
    end
  end
end
