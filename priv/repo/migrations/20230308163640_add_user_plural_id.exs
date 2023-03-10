defmodule Console.Repo.Migrations.AddUserPluralId do
  use Ecto.Migration

  def change do
    alter table(:watchman_users) do
      add :plural_id, :string
    end
  end
end
