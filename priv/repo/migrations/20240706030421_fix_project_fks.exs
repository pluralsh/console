defmodule Console.Repo.Migrations.FixProjectFks do
  use Console.Migration

  @disable_ddl_transaction true

  def change do
    drop_if_exists constraint(:global_services, :global_services_project_id_fkey)
    alter table(:global_services) do
      modify :project_id, references(:projects, type: :uuid)
    end

    drop_if_exists constraint(:managed_namespaces, :managed_namespaces_project_id_fkey)
    alter table(:managed_namespaces) do
      modify :project_id, references(:projects, type: :uuid)
    end
  end
end
