defmodule Console.Repo.Migrations.AddDisableInsightsProject do
  use Ecto.Migration

  def change do
    alter table(:projects) do
      add_if_not_exists :disable_insights, :boolean, default: false
    end
  end
end
