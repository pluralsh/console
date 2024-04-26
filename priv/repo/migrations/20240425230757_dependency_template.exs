defmodule Console.Repo.Migrations.DependencyTemplate do
  use Ecto.Migration

  def change do
    alter table(:service_dependencies) do
      add :template_id, references(:service_templates, type: :uuid, on_delete: :delete_all)
    end
  end
end
