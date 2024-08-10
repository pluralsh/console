defmodule Console.Repo.Migrations.AddHelmRepositories do
  use Console.Migration

  @disable_ddl_transaction true

  def change do
    create table(:helm_repositories, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :url,       :string
      add :status,    :integer
      add :provider,  :integer
      add :auth,      :map
      add :pulled_at, :utc_datetime_usec
      add :health,    :integer

      timestamps()
    end

    create unique_index(:helm_repositories, [:url])

    alter table(:policy_constraints) do
      add :enforcement, :integer
    end

    drop_if_exists constraint(:service_templates, :service_templates_repository_id_fkey)
    alter table(:service_templates) do
      modify :repository_id, references(:git_repositories, type: :uuid, on_delete: :delete_all)
    end

    drop_if_exists constraint(:global_services, :global_services_template_id_fkey)
    alter table(:global_services) do
      modify :template_id, references(:service_templates, type: :uuid)
    end

    drop_if_exists constraint(:managed_namespaces, :managed_namespaces_service_id_fkey)
    alter table(:managed_namespaces) do
      modify :service_id, references(:service_templates, type: :uuid)
    end
  end
end
