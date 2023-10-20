defmodule Console.Repo.Migrations.AddAuditItemId do
  use Ecto.Migration

  def change do
    alter table(:audits) do
      add :item_id, :uuid
    end
  end
end
