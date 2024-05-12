defmodule Console.Repo.Migrations.AddReviewIds do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :review_id, :string
    end
  end
end
