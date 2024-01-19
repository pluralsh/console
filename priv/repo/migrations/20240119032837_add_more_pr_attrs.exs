defmodule Console.Repo.Migrations.AddMorePrAttrs do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      add :creator, :string
      add :labels,  :map
    end
  end
end
