defmodule Console.Repo.Migrations.AddOnboardingStatus do
  use Ecto.Migration
  alias Console.Deployments.Settings
  alias Console.Schema.DeploymentSettings

  def change do
    alter table(:deployment_settings) do
      add :onboarded, :boolean, default: false
    end

    flush()

    with %DeploymentSettings{inserted_at: inserted_at} <- Settings.fetch_consistent(),
         true <- Timex.before?(inserted_at, Timex.shift(Timex.now(), days: -7)) do
      Settings.onboarded()
    end
  end
end
