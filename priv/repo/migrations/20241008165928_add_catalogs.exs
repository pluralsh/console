defmodule Console.Repo.Migrations.AddCatalogs do
  use Ecto.Migration

  def change do
    create table(:catalogs, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :string
      add :description, :string
      add :category,    :string
      add :author,      :string

      add :read_policy_id,  :uuid
      add :write_policy_id, :uuid

      add :project_id, references(:projects, type: :uuid)

      timestamps()
    end

    create unique_index(:catalogs, [:name])
    create index(:catalogs, [:category])
    create index(:catalogs, [:project_id])

    alter table(:pr_automations) do
      add :catalog_id, references(:catalogs, type: :uuid, on_delete: :nilify_all)
    end

    create index(:pr_automations, [:catalog_id])

    alter table(:tags) do
      add :catalog_id, references(:catalogs, type: :uuid, on_delete: :delete_all)
    end

    create unique_index(:tags, [:catalog_id, :name])
    create index(:tags, [:catalog_id])
  end
end
