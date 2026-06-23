defmodule Console.Repo.Migrations.AgentRunSkills do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :skills, :map
    end
  end
end
