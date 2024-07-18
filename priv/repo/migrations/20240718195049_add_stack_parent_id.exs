defmodule Console.Repo.Migrations.AddStackParentId do
  use Ecto.Migration

  def change do
    alter table(:stacks) do
      add :parent_id, :uuid
    end
  end
end
