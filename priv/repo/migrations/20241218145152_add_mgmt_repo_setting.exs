defmodule Console.Repo.Migrations.AddMgmtRepoSetting do
  use Ecto.Migration

  def change do
    alter table(:deployment_settings) do
      add :mgmt_repo, :string
    end
  end
end
