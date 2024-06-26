defmodule Console.Repo.Migrations.AddPipelineErrors do
  use Ecto.Migration

  def change do
    alter table(:service_errors) do
      add :pipeline_stage_id, references(:pipeline_stages, type: :uuid, on_delete: :delete_all)
    end
  end
end
