defmodule Console.Repo.Migrations.AddAccessTokens do
  use Ecto.Migration

  def change do
    create table(:access_tokens, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :token,        :string
      add :last_used_at, :utc_datetime_usec
      add :user_id,      references(:watchman_users, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create table(:access_token_audits, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :token_id,  references(:access_tokens, type: :uuid, on_delete: :delete_all)
      add :ip,        :string
      add :timestamp, :utc_datetime_usec
      add :count,     :integer, default: 0

      timestamps()
    end

    create unique_index(:access_tokens, [:token])
    create unique_index(:access_token_audits, [:token_id, :ip, :timestamp])
    create index(:access_token_audits, [:token_id])
  end
end
