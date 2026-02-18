defmodule Console.Repo.Migrations.AddStackDefinitionDeleteSteps do
  use Ecto.Migration

  def change do
    alter table(:stack_definitions) do
      add :delete_steps, :map
    end
  end
end
