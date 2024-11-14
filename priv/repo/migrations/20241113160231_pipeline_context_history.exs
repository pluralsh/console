defmodule Console.Repo.Migrations.PipelineContextHistory do
  use Ecto.Migration

  def change do
    create table(:pipeline_context_history, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :stage_id,   references(:pipeline_stages, type: :uuid, on_delete: :delete_all)
      add :context_id, references(:pipeline_contexts, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:pipeline_context_history, [:stage_id])
  end
end
