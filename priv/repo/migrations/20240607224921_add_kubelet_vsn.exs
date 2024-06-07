defmodule Console.Repo.Migrations.AddKubeletVsn do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :kubelet_version, :string
    end
  end
end
