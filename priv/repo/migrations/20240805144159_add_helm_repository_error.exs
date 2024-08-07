defmodule Console.Repo.Migrations.AddHelmRepositoryError do
  use Ecto.Migration

  def change do
    alter table(:helm_repositories) do
      add :error, :string
    end
  end
end
