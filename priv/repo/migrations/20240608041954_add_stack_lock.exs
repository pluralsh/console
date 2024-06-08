defmodule Console.Repo.Migrations.AddStackLock do
  use Ecto.Migration

  def change do
    alter table(:stacks) do
      add :locked_at, :utc_datetime_usec
    end
  end
end
