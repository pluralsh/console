defmodule Console.Repo.Migrations.ClusterInsightComponents do
  use Ecto.Migration

  def change do
    create table(:cluster_insight_components, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :nilify_all)
      add :group,     :string
      add :version,   :string
      add :kind,      :string
      add :namespace, :string
      add :name,      :string

      timestamps()
    end

    create index(:cluster_insight_components, [:cluster_id])

    alter table(:clusters) do
      add :insight_id, references(:ai_insights, type: :uuid, on_delete: :nilify_all)
    end
  end
end
