defmodule Console.Repo.Migrations.AddLastMessageAtThreads do
  use Ecto.Migration

  def change do
    alter table(:chat_threads) do
      add :last_message_at, :utc_datetime_usec
    end
  end
end
