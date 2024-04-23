defmodule Console.Repo.Migrations.AddObservabilityProviders do
  use Ecto.Migration

  def change do
    create table(:observability_providers, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :type,        :integer
      add :name,        :string
      add :credentials, :map

      timestamps()
    end

    create unique_index(:observability_providers, [:name])
  end
end
