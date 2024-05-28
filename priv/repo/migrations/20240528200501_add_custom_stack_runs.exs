defmodule Console.Repo.Migrations.AddCustomStackRuns do
  use Ecto.Migration

  def change do
    create table(:custom_stack_runs, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :name,          :string
      add :documentation, :string
      add :commands,      :map
      add :configuration, :map

      add :stack_id, references(:stacks, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:custom_stack_runs, [:stack_id])
    create unique_index(:custom_stack_runs, [:stack_id, :name])
  end
end
