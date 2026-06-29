defmodule Console.Repo.Migrations.AddOnboardingStatus do
  use Ecto.Migration
  alias Console.Deployments.Settings
  alias Console.Schema.DeploymentSettings

  def change do
    alter table(:deployment_settings) do
      add :onboarded, :boolean, default: false
    end
  end
end
