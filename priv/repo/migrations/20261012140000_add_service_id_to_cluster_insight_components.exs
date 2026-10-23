defmodule Console.Repo.Migrations.AddServiceIdToClusterInsightComponents do
  use Ecto.Migration

  def change do
    alter table(:cluster_insight_components) do
      add :service_id, :uuid
    end

    create index(:cluster_insight_components, [:service_id])
  end
end
