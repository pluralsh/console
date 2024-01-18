defmodule Console.Repo.Migrations.PromotionServiceSha do
  use Ecto.Migration

  def change do
    alter table(:promotion_services) do
      add :sha, :string
    end
  end
end
