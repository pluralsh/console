defmodule Console.Repo.Migrations.BuildMessageLength do
  use Ecto.Migration

  def change do
    alter table(:builds) do
      modify :message, :string, size: 10_000
    end
  end
end
