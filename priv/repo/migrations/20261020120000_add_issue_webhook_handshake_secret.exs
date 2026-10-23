defmodule Console.Repo.Migrations.AddIssueWebhookHandshakeSecret do
  use Ecto.Migration

  def change do
    alter table(:issue_webhooks) do
      add :handshake_secret, :string
    end
  end
end
