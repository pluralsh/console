defmodule Console.Repo.Migrations.AddScmWebhookOwner do
  use Ecto.Migration

  def change do
    alter table(:scm_webhooks) do
      add :owner, :string
    end
  end
end
