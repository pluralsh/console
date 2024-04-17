defmodule Console.Repo.Migrations.AddPromotedRevision do
  use Ecto.Migration

  def change do
    alter table(:pipeline_promotions) do
      add :applied_context_id, references(:pipeline_contexts, type: :uuid, on_delete: :nilify_all)
    end
  end
end
