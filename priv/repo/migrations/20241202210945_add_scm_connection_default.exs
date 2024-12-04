defmodule Console.Repo.Migrations.AddScmConnectionDefault do
  use Ecto.Migration

  def change do
    alter table(:scm_connections) do
      add :default, :boolean, default: false
    end

    create unique_index(:scm_connections, :default, where: "\"default\"")
  end
end
