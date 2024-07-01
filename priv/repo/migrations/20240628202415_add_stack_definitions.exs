defmodule Console.Repo.Migrations.AddStackDefinitions do
  use Ecto.Migration

  def change do
    create table(:stack_definitions, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :name, :string, nil: false
      add :description, :string

      add :configuration, :map
      add :steps,         :map

      timestamps()
    end

    create unique_index(:stack_definitions, [:name])

    alter table(:stacks) do
      add :definition_id, references(:stack_definitions, type: :uuid)
    end

    alter table(:run_steps) do
      add :require_approval, :boolean
    end
  end
end
