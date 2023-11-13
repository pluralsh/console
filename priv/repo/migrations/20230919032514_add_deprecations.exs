defmodule Console.Repo.Migrations.AddDeprecations do
  use Ecto.Migration

  def change do
    create table(:api_deprecations, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :component_id,  references(:service_components, type: :uuid, on_delete: :delete_all)
      add :deprecated_in, :string
      add :removed_in,    :string
      add :replacement,   :string
      add :available_in,  :string
      add :blocking,      :boolean

      timestamps()
    end

    create index(:api_deprecations, [:component_id])
  end
end
