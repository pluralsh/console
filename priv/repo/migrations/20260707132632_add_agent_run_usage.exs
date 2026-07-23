defmodule Console.Repo.Migrations.AddAgentRunUsage do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :usage, :map
    end
  end
end
