defmodule Console.Repo.Migrations.ExtendPrLengths do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      modify :title, :string, size: 510
      modify :url, :string, size: 510
    end
  end
end
