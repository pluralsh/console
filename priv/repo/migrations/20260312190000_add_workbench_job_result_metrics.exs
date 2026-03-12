defmodule Console.Repo.Migrations.AddWorkbenchJobResultMetrics do
  use Ecto.Migration

  def change do
    alter table(:workbench_job_results) do
      add :metrics, :map
    end
  end
end
