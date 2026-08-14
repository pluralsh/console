defmodule Console.Repo.Migrations.AddModesToQueuedPrompts do
  use Ecto.Migration

  def change do
    alter table(:queued_prompts) do
      add :modes, :map
    end
  end
end
