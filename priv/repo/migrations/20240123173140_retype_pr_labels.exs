defmodule Console.Repo.Migrations.RetypePrLabels do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      remove :labels
    end

    alter table(:pull_requests) do
      add :labels, {:array, :string}
    end
  end
end
