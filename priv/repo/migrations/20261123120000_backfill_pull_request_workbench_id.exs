defmodule Console.Repo.Migrations.BackfillPullRequestWorkbenchId do
  use Ecto.Migration

  def up do
    execute """
    UPDATE pull_requests pr
    SET workbench_id = j.workbench_id
    FROM workbench_jobs j
    WHERE pr.workbench_job_id = j.id
      AND pr.workbench_id IS NULL
    """
  end

  def down, do: :ok
end
