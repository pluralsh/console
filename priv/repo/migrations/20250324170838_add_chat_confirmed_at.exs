defmodule Console.Repo.Migrations.AddChatConfirmedAt do
  use Ecto.Migration

  def change do
    alter table(:chats) do
      add :confirmed_at, :utc_datetime_usec
    end
  end
end
