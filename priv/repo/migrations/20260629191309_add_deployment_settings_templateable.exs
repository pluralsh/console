defmodule Console.Repo.Migrations.AddDeploymentSettingsTemplateable do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :agent_helm_values_templateable, :boolean, default: false
    end
  end
end
