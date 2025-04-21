defmodule Console.Repo.Migrations.AddEntityRelations do
  use Ecto.Migration

  def change do
    alter table(:knowledge_entities) do
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)
      add :stack_id, references(:stacks, type: :uuid, on_delete: :delete_all)
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)
    end

    alter table(:ai_insight_evidence) do
      add :knowledge, :map
    end

    create index(:knowledge_entities, [:service_id])
    create index(:knowledge_entities, [:stack_id])
    create index(:knowledge_entities, [:cluster_id])
    create unique_index(:knowledge_entities, [:service_id, :name])
    create unique_index(:knowledge_entities, [:stack_id, :name])
    create unique_index(:knowledge_entities, [:cluster_id, :name])
  end
end
