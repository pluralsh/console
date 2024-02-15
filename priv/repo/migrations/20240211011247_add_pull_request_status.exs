defmodule Console.Repo.Migrations.AddPullRequestStatus do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      modify :status, :integer, default: 0
    end
  end
end
