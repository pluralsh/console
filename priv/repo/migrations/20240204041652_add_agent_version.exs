defmodule Console.Repo.Migrations.AddAgentVersion do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :agent_version, :string
      add :manage_agents, :boolean, default: true
    end

    alter table(:pr_automations) do
      add :role, :integer
    end
  end
end
