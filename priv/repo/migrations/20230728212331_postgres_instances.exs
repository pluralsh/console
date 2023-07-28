defmodule Console.Repo.Migrations.PostgresInstances do
  use Ecto.Migration

  def change do
    create table(:postgres_instances, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :namespace, :string
      add :name,      :string
      add :uid,       :string

      timestamps()
    end

    create index(:postgres_instances, [:namespace, :name])
    create unique_index(:postgres_instances, [:namespace, :name, :uid])
  end
end
