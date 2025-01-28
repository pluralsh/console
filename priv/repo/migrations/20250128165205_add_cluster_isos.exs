defmodule Console.Repo.Migrations.AddClusterIsos do
  use Ecto.Migration

  def change do
    create table(:cluster_iso_images, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :image,      :string
      add :project_id, references(:projects, type: :uuid, on_delete: :delete_all)
      add :creator_id, references(:watchman_users, type: :uuid, on_delete: :nilify_all)

      add :registry,   :string
      add :user,       :string
      add :password,   :string
      add :status,     :integer
      timestamps()
    end

    create unique_index(:cluster_iso_images, [:image])
    create index(:cluster_iso_images, [:project_id])
  end
end
