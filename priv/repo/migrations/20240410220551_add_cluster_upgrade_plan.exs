defmodule Console.Repo.Migrations.AddClusterUpgradePlan do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :upgrade_plan, :map
    end
  end
end
