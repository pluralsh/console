defmodule Console.Repo.Migrations.AddAgentSessions do
  use Ecto.Migration

  def change do
    create table(:agent_sessions, primary_key: false) do
      add :id,             :uuid, primary_key: true
      add :agent_id,       :string
      add :connection_id,  references(:cloud_connections, type: :uuid, on_delete: :nilify_all)
      add :plan_confirmed, :boolean, default: false
      add :thread_id,      references(:chat_threads, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    alter table(:services) do
      add :agent_id, :string
    end

    alter table(:stacks) do
      add :agent_id, :string
    end

    create unique_index(:agent_sessions, [:thread_id])
    create unique_index(:agent_sessions, [:agent_id])
    create index(:services, [:agent_id])
    create index(:stacks, [:agent_id])
  end
end
