defmodule Console.Repo.Migrations.AddAgentRuntimeBrowserEnabled do
  use Ecto.Migration

  def change do
    alter table(:agent_runtimes) do
      add :browser_enabled, :boolean, default: false, null: false
    end
  end
end
