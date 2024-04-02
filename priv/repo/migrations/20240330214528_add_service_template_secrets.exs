defmodule Console.Repo.Migrations.AddServiceTemplateSecrets do
  use Ecto.Migration

  def change do
    alter table(:service_templates) do
      add :revision_id, references(:revisions, type: :uuid)
    end

    alter table(:revisions) do
      add :template_id, references(:service_templates, type: :uuid, on_delete: :delete_all)
    end
  end
end
