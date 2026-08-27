defmodule Console.Repo.Migrations.AddFlowMaxPreviews do
  use Ecto.Migration

  @week_in_seconds 60 * 60 * 24 * 7

  def change do
    alter table(:flows) do
      add :max_previews, :integer, default: 10
    end

    alter table(:preview_environment_templates) do
      add :preview_ttl, :integer, default: @week_in_seconds
    end

    alter table(:preview_environment_instances) do
      add :preview_expires_at, :utc_datetime_usec
    end
  end
end
