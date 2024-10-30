defmodule Console.Repo.Migrations.AddChatThreading do
  use Ecto.Migration

  def change do
    create table(:chat_threads, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :user_id,    references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :summary,    :binary
      add :default,    :boolean, default: false
      add :summarized, :boolean, default: false

      timestamps()
    end

    create index(:chat_threads, [:user_id])

    alter table(:chat_sequences) do
      add :thread_id, references(:chat_threads, type: :uuid, on_delete: :delete_all)
    end

    alter table(:chats) do
      add :thread_id, references(:chat_threads, type: :uuid, on_delete: :delete_all)
    end

    create index(:chats, [:thread_id])
    create unique_index(:chat_sequences, [:thread_id])

    flush()

    :ok = Console.AI.Chat.backfill_threads()
  end
end
