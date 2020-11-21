defmodule Watchman.Repo.Migrations.ExtendAudits do
  use Ecto.Migration

  def change do
    alter table(:audits) do
      add :action, :integer
      add :data,   :binary
      add :repository, :string
    end
  end
end
