defmodule Console.Repo.Migrations.AddUserEmailSettings do
  use Ecto.Migration

  def change do
    alter table(:watchman_users) do
      add :email_settings, :map
    end
  end
end
