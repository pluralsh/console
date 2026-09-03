defmodule Console.Repo.Migrations.AddAgentRunCheckId do
  use Ecto.Migration

  def change do
    alter table(:agent_runs) do
      add :check_id, :string
    end
  end
end
