defmodule Console.Repo.Migrations.AddJobResultTopology do
  use Ecto.Migration

  def change do
    alter table(:workbench_job_results) do
      add :topology, :binary
    end
  end
end
