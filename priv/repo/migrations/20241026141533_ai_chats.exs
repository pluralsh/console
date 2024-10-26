defmodule Console.Repo.Migrations.AiChats do
  use Ecto.Migration

  def change do
    create table(:chats, primary_key: false) do
      add :id,      :uuid, primary_key: true
      add :user_id, references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :role,    :integer
      add :content, :binary
      add :seq,     :integer

      timestamps()
    end

    create index(:chats, [:user_id])
    create index(:chats, [:user_id, :seq])

    create table(:chat_sequences, primary_key: false) do
      add :id,      :uuid, primary_key: true
      add :user_id, references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :counter, :integer, default: 0
    end

    create unique_index(:chat_sequences, [:user_id])
  end
end
