defmodule Console.Repo.Migrations.AddPromotionInfo do
  use Ecto.Migration

  def change do
    alter table(:services) do
      add :promotion, :integer, default: 0
    end
  end
end
