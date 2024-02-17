defmodule Console.Repo.Migrations.AddPersonas do
  use Ecto.Migration

  def change do
    create table(:personas, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :name,          :string
      add :description,   :string
      add :bindings_id,   :uuid
      add :configuration, :map

      timestamps()
    end

    create unique_index(:personas, [:name])
  end
end
