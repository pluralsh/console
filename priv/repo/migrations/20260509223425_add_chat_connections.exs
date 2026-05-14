defmodule Console.Repo.Migrations.AddChatConnections do
  use Ecto.Migration

  def change do
    alter table(:chat_connections) do
      add :read_policy_id, :uuid
      add :write_policy_id, :uuid
    end

    create index(:chat_connections, [:read_policy_id])
    create index(:chat_connections, [:write_policy_id])

    create table(:chatbot_messages, primary_key: false) do
      add :id,                 :uuid, primary_key: true
      add :chat_connection_id, references(:chat_connections, type: :uuid, on_delete: :delete_all)
      add :workbench_job_id,   references(:workbench_jobs, type: :uuid, on_delete: :delete_all)
      add :message,            :binary
      add :channel,            :string

      timestamps()
    end

    create index(:chatbot_messages, [:chat_connection_id])
    create index(:chatbot_messages, [:workbench_job_id])

    create table(:workbench_chatbots, primary_key: false) do
      add :id,                 :uuid, primary_key: true
      add :workbench_id,       references(:workbenches, type: :uuid, on_delete: :delete_all)
      add :chat_connection_id, references(:chat_connections, type: :uuid, on_delete: :delete_all)
      add :user_id,            references(:watchman_users, type: :uuid, on_delete: :nilify_all)
      add :channel,            :string
      add :prompt,             :binary

      timestamps()
    end

    create unique_index(:workbench_chatbots, [:channel])
    create index(:workbench_chatbots, [:workbench_id])
    create index(:workbench_chatbots, [:chat_connection_id])
    create index(:workbench_chatbots, [:user_id])
  end
end
