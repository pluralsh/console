defmodule Console.Repo.Migrations.AddRepositoryPromoCriteria do
  use Ecto.Migration

  def change do
    alter table(:promotion_criteria) do
      add :repository, :string
    end
  end
end
