defmodule Console.Repo.Migrations.AddAgentSessionDone do
  use Ecto.Migration

  def change do
    alter table(:agent_sessions) do
      add :done, :boolean, default: false
    end
  end
end
