defmodule Console.Repo.Migrations.NilifyOwnerId do
  use Ecto.Migration

  def change do
    alter table(:services) do
      modify :owner_id, references(:global_services, type: :uuid, on_delete: :nilify_all),
        from: references(:global_services, type: :uuid)
    end

    alter table(:global_services) do
      add :reparent, :boolean
      modify :template_id, references(:service_templates, type: :uuid, on_delete: :delete_all),
        from: references(:service_templates, type: :uuid)
    end

    alter table(:managed_namespaces) do
      modify :service_id, references(:service_templates, type: :uuid, on_delete: :delete_all),
        from: references(:service_templates, type: :uuid)
    end
  end
end
