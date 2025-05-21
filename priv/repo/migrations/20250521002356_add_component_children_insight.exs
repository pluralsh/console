defmodule Console.Repo.Migrations.AddComponentChildrenInsight do
  use Ecto.Migration

  def change do
    alter table(:service_component_children) do
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :nilify_all)
    end
  end
end
