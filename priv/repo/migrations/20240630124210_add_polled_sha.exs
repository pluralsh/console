defmodule Console.Repo.Migrations.AddPolledSha do
  use Ecto.Migration

  def change do
    alter table(:stacks) do
      add :polled_sha, :string
    end

    alter table(:pull_requests) do
      add :polled_sha, :string
    end
  end
end
