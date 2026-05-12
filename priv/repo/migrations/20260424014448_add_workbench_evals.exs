defmodule Console.Repo.Migrations.AddWorkbenchEvals do
  use Ecto.Migration

  def change do
    create table(:workbench_evals, primary_key: false) do
      add :id,                :uuid, primary_key: true
      add :workbench_id,      references(:workbenches, type: :uuid, on_delete: :delete_all)
      add :conclusion_rules,  :binary
      add :prompt_rules,      :binary
      add :progress_rules,    :binary

      timestamps()
    end

    create unique_index(:workbench_evals, [:workbench_id])

    create table(:workbench_eval_results, primary_key: false) do
      add :id,                :uuid, primary_key: true
      add :grade,             :integer
      add :feedback,          :map
      add :workbench_eval_id, references(:workbench_evals, type: :uuid, on_delete: :delete_all)
      add :workbench_job_id,  references(:workbench_jobs, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:workbench_eval_results, [:workbench_eval_id, :workbench_job_id])
    create index(:workbench_eval_results, [:workbench_eval_id])
    create index(:workbench_eval_results, [:workbench_job_id])
  end
end
