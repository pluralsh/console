defmodule Console.Repo.Migrations.AddInstalled do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :installed, :boolean, default: false
    end
  end
end
