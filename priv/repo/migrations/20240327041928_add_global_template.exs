defmodule Console.Repo.Migrations.AddGlobalTemplate do
  use Ecto.Migration

  def change do
    alter table(:global_services) do
      add :template_id, references(:service_templates, type: :uuid, on_delete: :delete_all)
    end

    alter table(:service_templates) do
      add :sync_config, :map
      add :namespace,   :string
      add :name,        :string
    end
  end
end
