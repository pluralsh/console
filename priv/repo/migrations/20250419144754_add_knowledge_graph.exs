defmodule Console.Repo.Migrations.AddKnowledgeGraph do
  use Ecto.Migration

  def change do
    create table(:knowledge_entities, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :type,        :string
      add :name,        :string
      add :description, :string

      add :flow_id, references(:flows, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create table(:knowledge_observations, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :entity_id,   references(:knowledge_entities, type: :uuid, on_delete: :delete_all)
      add :observation, :string

      timestamps()
    end

    create table(:knowledge_relationships, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :type,        :string
      add :from_id,     references(:knowledge_entities, type: :uuid, on_delete: :delete_all)
      add :to_id,       references(:knowledge_entities, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:knowledge_entities, [:flow_id])
    create unique_index(:knowledge_entities, [:flow_id, :name])

    create index(:knowledge_observations, [:entity_id])

    create index(:knowledge_relationships, [:from_id])
    create index(:knowledge_relationships, [:to_id])
    create unique_index(:knowledge_relationships, [:from_id, :to_id, :type])
  end
end
