defmodule Console.Repo.Migrations.AddPersonaRole do
  use Ecto.Migration

  def change do
    alter table(:personas) do
      add :role, :integer, default: 0
    end
  end
end
