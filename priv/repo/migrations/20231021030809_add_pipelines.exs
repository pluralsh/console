defmodule Console.Repo.Migrations.AddPipelines do
  use Ecto.Migration

  def change do
    create table(:pipelines, primary_key: false) do
      add :id,              :uuid, primary_key: true
      add :name,            :string, nil: false
      add :write_policy_id, :uuid
      add :read_policy_id,  :uuid

      timestamps()
    end

    create table(:pipeline_stages, primary_key: false) do
      add :id,                 :uuid, primary_key: true
      add :name,               :string, nil: false
      add :pipeline_id,        references(:pipelines, type: :uuid, on_delete: :delete_all)
      add :cursor,             :uuid
      add :last_deployment_at, :utc_datetime_usec
      add :stabilized_at,      :utc_datetime_usec

      timestamps()
    end

    create table(:pipeline_promotions, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :stage_id, references(:pipeline_stages, type: :uuid, on_delete: :delete_all)
      add :promoted_at, :utc_datetime_usec
      add :revised_at, :utc_datetime_usec

      timestamps()
    end

    create table(:promotion_services, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :promotion_id, references(:pipeline_promotions, type: :uuid, on_delete: :delete_all)
      add :service_id,   references(:services, type: :uuid, on_delete: :delete_all)
      add :revision_id,  references(:revisions, type: :uuid, on_delete: :delete_all)
      timestamps()
    end

    create table(:stage_services, primary_key: false) do
      add :id,                 :uuid, primary_key: true
      add :stage_id,           references(:pipeline_stages, type: :uuid, on_delete: :delete_all)
      add :service_id,         references(:services, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create table(:promotion_criteria, primary_key: false) do
      add :id,               :uuid, primary_key: true
      add :secrets,          {:array, :string}
      add :source_id,        references(:services, type: :uuid, on_delete: :delete_all)
      add :stage_service_id, references(:stage_services, type: :uuid, on_delete: :delete_all)
      timestamps()
    end

    create table(:pipeline_edges, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :pipeline_id, references(:pipelines, type: :uuid, on_delete: :delete_all)
      add :from_id,     references(:pipeline_stages, type: :uuid, on_delete: :delete_all)
      add :to_id,       references(:pipeline_stages, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:pipelines, [:name])
    create unique_index(:pipeline_stages, [:pipeline_id, :name])
    create index(:promotion_services, [:promotion_id])
    create unique_index(:promotion_services, [:promotion_id, :service_id])
    create unique_index(:stage_services, [:service_id])
    create index(:stage_services, [:stage_id])
    create index(:pipeline_edges, [:pipeline_id])
    create unique_index(:pipeline_edges, [:from_id, :to_id])
    create unique_index(:promotion_criteria, [:stage_service_id])
    create unique_index(:pipeline_promotions, [:stage_id])
  end
end
