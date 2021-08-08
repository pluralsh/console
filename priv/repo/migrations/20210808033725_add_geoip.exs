defmodule Console.Repo.Migrations.AddGeoip do
  use Ecto.Migration

  def change do
    alter table(:audits) do
      add :ip,        :string
      add :country,   :string
      add :city,      :string
      add :longitude, :string
      add :latitude,  :string
    end
  end
end
