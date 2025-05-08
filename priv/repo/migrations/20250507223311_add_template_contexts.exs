defmodule Console.Repo.Migrations.AddTemplateContexts do
  use Ecto.Migration

  def change do
    create table(:template_contexts, primary_key: false) do
      add :id,     :uuid, primary_key: true
      add :raw,    :map

      add :global_id, references(:global_services, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:template_contexts, [:global_id])
  end
end
