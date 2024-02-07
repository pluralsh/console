defmodule Console.Repo.Migrations.AddAgentHelmValues do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :agent_helm_values, :binary
    end

    alter table(:agent_migrations) do
      add :helm_values, :binary
    end
  end
end
