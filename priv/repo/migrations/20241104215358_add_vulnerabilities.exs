defmodule Console.Repo.Migrations.AddVulnerabilities do
  use Ecto.Migration

  def change do
    create table(:vulnerability_reports, primary_key: false) do
      add :id, :uuid, primary_key: true

      add :artifact_url, :string
      add :os,           :map
      add :summary,      :map
      add :artifact,     :map
      add :grade,        :integer

      add :cluster_id, references(:clusters, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:vulnerability_reports, [:cluster_id])

    create table(:vulnerabilities, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :resource,  :string

      add :fixed_version, :string
      add :installed_version, :string

      add :published_date,     :utc_datetime_usec
      add :last_modified_date, :utc_datetime_usec

      add :severity,     :integer
      add :title,        :string
      add :description,  :binary
      add :cvss_source,  :string
      add :primary_link, :string
      add :links,        {:array, :string}
      add :score,        :float

      add :target,        :string

      add :cvss,         :map
      add :class,        :string
      add :package_type, :string
      add :pkg_path,     :string

      add :report_id, references(:vulnerability_reports, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:vulnerabilities, [:report_id])

    create table(:service_vulns, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)
      add :report_id,  references(:vulnerability_reports, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create table(:namespace_vulns, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :namespace, :string
      add :report_id, references(:vulnerability_reports, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create index(:service_vulns, [:service_id])
    create index(:service_vulns, [:report_id])

    create index(:namespace_vulns, [:report_id])
  end
end
