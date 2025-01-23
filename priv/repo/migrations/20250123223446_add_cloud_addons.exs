defmodule Console.Repo.Migrations.AddCloudAddons do
  use Ecto.Migration

  def change do
    create table(:cloud_addons, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :distro,     :integer
      add :name,       :string
      add :version,    :string
      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create unique_index(:cloud_addons, [:cluster_id, :name])
    create index(:cloud_addons, [:cluster_id])
  end
end
