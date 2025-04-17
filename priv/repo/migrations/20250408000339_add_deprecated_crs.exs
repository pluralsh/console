defmodule Console.Repo.Migrations.AddDeprecatedCrs do
  use Ecto.Migration

  def change do
    create table(:deprecated_custom_resources, primary_key: false) do
      add :id,           :binary_id, primary_key: true
      add :group,        :string
      add :version,      :string
      add :kind,         :string
      add :namespace,    :string
      add :name,         :string
      add :next_version, :string
      add :cluster_id,   references(:clusters, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:deprecated_custom_resources, [:cluster_id])
    create unique_index(:deprecated_custom_resources, [:cluster_id, :group, :version, :kind, :namespace, :name])
  end
end
