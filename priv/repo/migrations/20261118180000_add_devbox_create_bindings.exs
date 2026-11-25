defmodule Console.Repo.Migrations.AddDevboxCreateBindings do
  use Ecto.Migration

  def change do
    alter table(:devboxes) do
      add :create_policy_id, :uuid
    end
  end
end
