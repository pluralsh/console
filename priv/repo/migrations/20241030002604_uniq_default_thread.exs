defmodule Console.Repo.Migrations.UniqDefaultThread do
  use Ecto.Migration

  def change do
    create unique_index(:chat_threads, [:user_id], where: "\"default\"", name: :chat_threads_user_id_uniq_index)
  end
end
