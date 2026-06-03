defmodule Console.Repo.Migrations.AddAgentRunConsumedFrom do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :consumed, :uuid
    end
  end
end
