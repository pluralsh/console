defmodule Console.Repo.Migrations.AddClusterTunnelClient do
  use Ecto.Migration

  def change do
    alter table(:clusters) do
      add :tunnel_cert, :binary
      add :tunnel_key,  :binary
    end
  end
end
