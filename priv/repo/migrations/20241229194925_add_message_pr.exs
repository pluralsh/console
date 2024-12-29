defmodule Console.Repo.Migrations.AddMessagePr do
  use Ecto.Migration

  def change do
    alter table(:chats) do
      add :pull_request_id, references(:pull_requests, type: :uuid, on_delete: :nilify_all)
    end
  end
end
