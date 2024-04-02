defmodule Console.Repo.Migrations.AddPinnedCustomResources do
  use Ecto.Migration

  def change do
    create table(:pinned_custom_resources, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :kind,         :string
      add :group,        :string
      add :version,      :string
      add :display_name, :string
      add :namespaced,   :boolean
      add :cluster_id,   references(:clusters, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:pinned_custom_resources, [:cluster_id])
  end
end
