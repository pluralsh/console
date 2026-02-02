defmodule Console.Repo.Migrations.AddObserverAgentRuns do
  use Ecto.Migration

  def change do
    alter table(:observers) do
      add :agent_run_id, references(:agent_runs, type: :uuid, on_delete: :nilify_all)
    end

    create index(:observers, [:agent_run_id])
  end
end
