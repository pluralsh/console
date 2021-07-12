defmodule Console.Repo.Migrations.AddUserAvatar do
  use Ecto.Migration

  def change do
    alter table(:watchman_users) do
      add :profile, :string
    end
  end
end
