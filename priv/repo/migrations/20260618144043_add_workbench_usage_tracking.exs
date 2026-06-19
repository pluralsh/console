defmodule Console.Repo.Migrations.AddWorkbenchUsageTracking do
  use Ecto.Migration

  def change do
    alter table(:workbench_jobs) do
      add :usage, :map
    end
  end
end
