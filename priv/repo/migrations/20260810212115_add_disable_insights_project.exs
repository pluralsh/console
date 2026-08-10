defmodule Console.Repo.Migrations.AddDisableInsightsProject do
  use Ecto.Migration

  def change do
    alter table(:projects) do
      add :disable_insights, :boolean, default: false
    end
  end
end
