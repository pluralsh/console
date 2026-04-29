defmodule Console.Repo.Migrations.ExtendIssueBodyIsze do
  use Ecto.Migration

  def change do
    alter table(:issues) do
      modify :body, :string, size: 10_000
    end

    alter table(:watchman_users) do
      add :homepage, :integer, default: 0
    end
  end
end
