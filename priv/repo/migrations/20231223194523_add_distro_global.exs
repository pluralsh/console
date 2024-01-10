defmodule Console.Repo.Migrations.AddDistroGlobal do
  use Ecto.Migration

  def change do
    alter table(:global_services) do
      add :distro, :integer
    end
  end
end
