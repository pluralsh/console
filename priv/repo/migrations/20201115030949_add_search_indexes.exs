defmodule Watchman.Repo.Migrations.AddSearchIndexes do
  use Ecto.Migration

  def change do
    create index(:watchman_users, [:name])
  end
end
