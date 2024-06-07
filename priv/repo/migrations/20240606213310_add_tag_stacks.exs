defmodule Console.Repo.Migrations.AddTagStacks do
  use Ecto.Migration

  def change do
    alter table(:tags) do
      add :stack_id, references(:stacks, type: :uuid, on_delete: :delete_all)
    end
  end
end
