defmodule Console.Repo.Migrations.AddComponentChildren do
  use Ecto.Migration

  def change do
    create table(:service_component_children, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :state,      :integer
      add :uid,        :string
      add :parent_uid, :string
      add :name,       :string
      add :namespace,  :string
      add :group,      :string
      add :version,    :string
      add :kind,       :string

      add :component_id, references(:service_components, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:service_component_children, [:component_id])
  end
end
