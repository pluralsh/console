defmodule Console.Repo.Migrations.AddWorkdir do
  use Ecto.Migration

  def change do
    alter table(:stacks) do
      add :workdir, :string
    end
  end
end
