defmodule Console.Repo.Migrations.AddAgentSessionRunAssoc do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :session_id, references(:agent_sessions, type: :uuid, on_delete: :nilify_all)
      add :branch,     :string
    end

    create index(:agent_runs, [:session_id])
  end
end
