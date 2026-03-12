defmodule Console.Repo.Migrations.AddWorkbenchJobResultMetadata do
  use Ecto.Migration

  def change do
    alter table(:workbench_job_results) do
      add :metadata, :map
    end
  end
end
