defmodule Console.Repo.Migrations.AddAgentRunFollowup do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :followup, :boolean, default: false
    end
  end
end
