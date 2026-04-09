defmodule Console.Repo.Migrations.AddMetricsExportSettings do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :metrics, :map
    end
  end
end
