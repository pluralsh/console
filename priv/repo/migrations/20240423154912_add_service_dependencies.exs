defmodule Console.Repo.Migrations.AddServiceDependencies do
  use Ecto.Migration

  def change do
    create table(:service_dependencies, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :name,       :string
      add :status,     :integer
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:service_dependencies, [:name])
  end
end
