defmodule Console.Repo.Migrations.ChangeObservationType do
  use Ecto.Migration

  def change do
    execute "ALTER TABLE knowledge_observations ALTER COLUMN observation TYPE bytea USING observation::bytea"
  end
end
