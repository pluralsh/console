defmodule Console.Repo.Migrations.FixCascadesNotificationRouters do
  use Ecto.Migration

  def change do
    execute "ALTER TABLE router_filters DROP CONSTRAINT router_filters_service_id_fkey"
    execute "ALTER TABLE router_filters DROP CONSTRAINT router_filters_cluster_id_fkey"
    execute "ALTER TABLE router_filters DROP CONSTRAINT router_filters_pipeline_id_fkey"
    alter table(:router_filters) do
      modify :service_id,  references(:services,  type: :uuid, on_delete: :nilify_all)
      modify :cluster_id,  references(:clusters,  type: :uuid, on_delete: :nilify_all)
      modify :pipeline_id, references(:pipelines, type: :uuid, on_delete: :nilify_all)
    end

    create index(:router_filters, [:service_id])
    create index(:router_filters, [:cluster_id])
    create index(:router_filters, [:pipeline_id])
  end
end
