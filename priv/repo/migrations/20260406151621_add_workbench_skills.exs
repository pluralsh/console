defmodule Console.Repo.Migrations.AddWorkbenchSkills do
  use Ecto.Migration

  def change do
    create table(:workbench_skills, primary_key: false) do
      add :id,          :uuid, primary_key: true
      add :name,        :string
      add :description, :string, size: 1024
      add :contents,    :binary
      add :workbench_id, references(:workbenches, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:workbench_skills, [:workbench_id])
    create unique_index(:workbench_skills, [:workbench_id, :name])
  end
end
