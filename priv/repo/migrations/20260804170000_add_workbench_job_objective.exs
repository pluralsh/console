defmodule Console.Repo.Migrations.AddWorkbenchJobObjective do
  use Ecto.Migration

  def change do
    alter table(:workbench_job_results) do
      add :objective, :binary
    end
  end
end
