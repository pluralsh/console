defmodule Console.Repo.Migrations.AddPrFilterRegex do
  use Ecto.Migration

  def change do
    alter table(:router_filters) do
      add :regex, :string
    end
  end
end
