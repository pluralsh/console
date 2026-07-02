defmodule Console.Repo.Migrations.AddOnboardingStatus do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :onboarded, :boolean, default: false
    end
  end
end
