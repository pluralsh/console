defmodule Console.Repo.Migrations.AddChatConnection do
  use Ecto.Migration

  def change do
    create table(:chat_connections, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :name,          :string
      add :type,          :integer, null: false, default: 0
      add :configuration, :map

      timestamps()
    end

    create unique_index(:chat_connections, [:name, :type])

    create table(:tool_integrations, primary_key: false) do
      add :id, :uuid, primary_key: true
      add :name, :string
      add :type, :integer, null: false, default: 0
      add :configuration, :map

      timestamps()
    end

    create unique_index(:tool_integrations, [:name, :type])
  end
end
