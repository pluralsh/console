defmodule Console.Repo.Migrations.AddFilenameToCauses do
  use Ecto.Migration

  def change do
    alter table(:stack_violation_causes) do
      add :filename, :string
    end
  end
end
