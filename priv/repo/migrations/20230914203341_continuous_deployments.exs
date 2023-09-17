defmodule Console.Repo.Migrations.ContinuousDeployments do
  use Ecto.Migration

  def change do
    create table(:cluster_providers, primary_key: false) do
      add :id,             :uuid, primary_key: true
      add :name,           :string
      add :namespace,      :string
      add :cloud,          :string
      add :cloud_settings, :map

      timestamps()
    end

    create table(:clusters, primary_key: false) do
      add :id,              :uuid, primary_key: true
      add :provider_id,     references(:cluster_providers, type: :uuid)
      add :self,            :boolean
      add :kubeconfig,      :map
      add :resource,        :map
      add :version,         :string
      add :current_version, :string
      add :name,            :string
      add :deploy_token,    :string
      add :write_policy_id, :uuid
      add :read_policy_id,  :uuid
      add :deleted_at,      :utc_datetime_usec

      timestamps()
    end

    create table(:cluster_node_pools, primary_key: false) do
      add :id,             :uuid, primary_key: true
      add :name,           :string
      add :cluster_id,     references(:clusters, type: :uuid, on_delete: :delete_all)
      add :min_size,       :integer
      add :max_size,       :integer
      add :instance_type,  :string
      add :labels,         :map
      add :taints,         :map
      add :cloud_settings, :map

      timestamps()
    end

    create table(:git_repositories, primary_key: false) do
      add :id,           :uuid, primary_key: true
      add :url,          :string
      add :auth_method,  :integer
      add :health,       :integer
      add :pulled_at,    :utc_datetime_usec
      add :private_key,  :binary
      add :passphrase,   :string
      add :username,     :string
      add :password,     :string
      add :error,        :binary

      timestamps()
    end

    create table(:services, primary_key: false) do
      add :id,              :uuid, primary_key: true
      add :name,            :name
      add :version,         :string
      add :cluster_id,      references(:clusters, type: :uuid, on_delete: :delete_all)
      add :repository_id,   references(:git_repositories, type: :uuid)
      add :namespace,       :string
      add :git,             :map
      add :sha,             :string
      add :write_policy_id, :uuid
      add :read_policy_id,  :uuid

      add :deleted_at,      :utc_datetime_usec

      timestamps()
    end

    create table(:service_components, primary_key: false) do
      add :id,         :uuid, primary_key: true
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)
      add :group,      :string
      add :version,    :string
      add :kind,       :string
      add :namespace,  :string
      add :name,       :string
      add :synced,     :boolean
      add :state,      :integer

      timestamps()
    end

    alter table(:clusters) do
      add :service_id, references(:services, type: :uuid, on_delete: :delete_all)
    end

    alter table(:cluster_providers) do
      add :service_id,    references(:services, type: :uuid, on_delete: :delete_all)
      add :repository_id, references(:git_repositories, type: :uuid)
      add :git,           :map
    end

    create table(:revisions, primary_key: false) do
      add :id,            :uuid, primary_key: true
      add :service_id,    references(:services, type: :uuid, on_delete: :delete_all)
      add :version,       :string
      add :git,           :map
      add :sha,           :string

      timestamps()
    end

    alter table(:services) do
      add :revision_id, references(:revisions, type: :uuid, on_delete: :delete_all)
    end

    create table(:service_configuration, primary_key: false) do
      add :id,    :uuid, primary_key: true
      add :name,  :string
      add :value, :binary

      add :revision_id, references(:revisions, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create table(:policy_bindings, primary_key: false) do
      add :id,        :uuid, primary_key: true
      add :policy_id, :uuid
      add :user_id,   references(:watchman_users, type: :uuid, on_delete: :delete_all)
      add :group_id,  references(:groups, type: :uuid, on_delete: :delete_all)

      timestamps()
    end

    create table(:deployment_settings, primary_key: false) do
      add :id,                      :uuid,  primary_key: true
      add :name,                    :string
      add :write_policy_id,         :uuid
      add :read_policy_id,          :uuid
      add :create_policy_id,        :uuid
      add :git_policy_id,           :uuid

      add :artifact_repository_id, references(:git_repositories, type: :uuid)
      add :deployer_repository_id,  references(:git_repositories, type: :uuid)

      timestamps()
    end

    create unique_index(:deployment_settings, [:name])
    create unique_index(:cluster_providers, [:name])
    create index(:cluster_node_pools, [:cluster_id])
    create unique_index(:cluster_node_pools, [:cluster_id, :name])
    create unique_index(:services, [:cluster_id, :name])
    create index(:services, [:cluster_id])
    create index(:service_components, [:service_id])
    create index(:revisions, [:service_id])
    create index(:service_configuration, [:revision_id])
    create unique_index(:service_configuration, [:revision_id, :name])
    create unique_index(:git_repositories, [:url])
  end
end
