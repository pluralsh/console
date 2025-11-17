defmodule Console.Repo.Migrations.AddRepositoryUrlVulnerabilities do
  use Ecto.Migration

  def change do
    alter table(:vulnerabilities) do
      add :repository_url, :string
    end
  end
end
