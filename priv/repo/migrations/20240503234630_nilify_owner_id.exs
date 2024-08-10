defmodule Console.Repo.Migrations.NilifyOwnerId do
  use Console.Migration

  @disable_ddl_transaction true

  def change do
    drop_if_exists constraint(:services, :services_owner_id_fkey)
    alter table(:services) do
      modify :owner_id, references(:global_services, type: :uuid, on_delete: :nilify_all)
    end

    drop_if_exists constraint(:global_services, :global_services_template_id_fkey)
    alter table(:global_services) do
      add :reparent, :boolean
      modify :template_id, references(:service_templates, type: :uuid, on_delete: :delete_all)
    end

    drop_if_exists constraint(:managed_namespaces, :managed_namespaces_service_id_fkey)
    alter table(:managed_namespaces) do
      modify :service_id, references(:service_templates, type: :uuid, on_delete: :delete_all)
    end
  end
end
