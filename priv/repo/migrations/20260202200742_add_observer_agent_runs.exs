defmodule Console.Repo.Migrations.AddObserverAgentRuns do
  use Ecto.Migration

  def change do
    alter table(:observers) do
      add :agent_run_id, references(:agent_runs, type: :uuid, on_delete: :nilify_all)
    end

    create index(:observers, [:agent_run_id])

    alter table(:agent_sessions) do
      add :runtime_id, references(:agent_runtimes, type: :uuid, on_delete: :nilify_all)
    end

    create index(:agent_sessions, [:runtime_id])

    alter table(:chats) do
      add :agent_run_id, references(:agent_runs, type: :uuid, on_delete: :nilify_all)
    end

    create index(:chats, [:agent_run_id])
  end
end
