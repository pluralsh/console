defmodule Console.Repo.Migrations.AddCommitMessage do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :message, :binary
    end

    alter table(:revisions) do
      add :message, :binary
    end
  end
end
