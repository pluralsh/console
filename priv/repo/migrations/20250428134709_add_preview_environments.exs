defmodule Console.Repo.Migrations.AddPreviewEnvironments do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :preview,     :string
      add :attributes,  :map
    end

    create table(:preview_environment_templates, primary_key: false) do
      add :id,                   :binary_id, primary_key: true
      add :name,                 :string
      add :flow_id,              references(:flows, type: :binary_id, on_delete: :delete_all)
      add :reference_service_id, references(:services, type: :binary_id, on_delete: :delete_all)
      add :template_id,          references(:service_templates, type: :uuid, on_delete: :delete_all)
      add :connection_id,        references(:scm_connections, type: :binary_id, on_delete: :delete_all)
      add :comment_template,     :string

      timestamps()
    end

    create table(:preview_environment_instances, primary_key: false) do
      add :id,              :binary_id, primary_key: true
      add :template_id,     references(:preview_environment_templates, type: :binary_id)
      add :service_id,      references(:services, type: :binary_id, on_delete: :delete_all)
      add :pull_request_id, references(:pull_requests, type: :binary_id)
      add :status,          :map

      timestamps()
    end

    create unique_index(:preview_environment_templates, [:flow_id, :name])
    create index(:preview_environment_instances, [:pull_request_id])
    create unique_index(:preview_environment_instances, [:template_id, :pull_request_id])
    create index(:preview_environment_instances, [:template_id])
    create unique_index(:preview_environment_instances, [:service_id])
  end
end
