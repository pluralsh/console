defmodule Console.Repo.Migrations.ExtendProfileLength do
  use Ecto.Migration

  def change do
    alter table(:watchman_users) do
      modify :profile, :string, size: 1000
    end
  end
end
