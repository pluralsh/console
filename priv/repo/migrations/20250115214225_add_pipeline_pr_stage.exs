defmodule Console.Repo.Migrations.AddPipelinePrStage do
  use Ecto.Migration

  def change do
    alter table(:pipeline_pull_requests) do
      add :stage_id, references(:pipeline_stages, type: :uuid, on_delete: :delete_all)
    end
  end
end
