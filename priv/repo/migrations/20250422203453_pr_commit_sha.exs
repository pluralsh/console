defmodule Console.Repo.Migrations.PrCommitSha do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :commit_sha, :string
      add :approver,   :string
    end
  end
end
