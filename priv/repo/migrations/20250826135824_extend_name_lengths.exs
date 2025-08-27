defmodule Console.Repo.Migrations.ExtendNameLengths do
  use Ecto.Migration

  def change do
    alter table(:service_contexts) do
      modify :name, :string, size: 1000
    end

    alter table(:services) do
      modify :name, :string, size: 510
    end
  end
end
