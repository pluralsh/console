defmodule Console.Repo.Migrations.AddPrPromotions do
  use Ecto.Migration

  def change do
    alter table(:promotion_criteria) do
      add :pr_automation_id, references(:pr_automations, type: :uuid)
    end

    create table(:pipeline_contexts, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :pipeline_id, references(:pipelines, type: :uuid, on_delete: :delete_all)
      add :context,     :map

      timestamps()
    end

    alter table(:pipeline_stages) do
      add :context_id, references(:pipeline_contexts, type: :uuid, on_delete: :nilify_all)
      add :applied_context_id, references(:pipeline_contexts, type: :uuid, on_delete: :nilify_all)
    end

    create table(:pipeline_pull_requests, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :context_id, references(:pipeline_contexts, type: :uuid, on_delete: :delete_all)
      add :pull_request_id, references(:pull_requests, type: :uuid, on_delete: :delete_all)
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    alter table(:pipeline_promotions) do
      add :context_id, references(:pipeline_contexts, type: :uuid, on_delete: :nilify_all)
    end

    create index(:pipeline_contexts, [:pipeline_id])
    create index(:pipeline_pull_requests, [:context_id])
  end
end
