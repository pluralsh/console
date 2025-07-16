defmodule Console.Repo.Migrations.AddAgentSessionClusterId do
  use Ecto.Migration

  def change do
    alter table(:agent_sessions) do
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :nilify_all)
    end
  end
end
