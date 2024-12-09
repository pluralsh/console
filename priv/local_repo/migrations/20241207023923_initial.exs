defmodule Console.LocalRepo.Migrations.Initial do
  use Ecto.Migration

  def change do
    create table(:pod_memory_requests) do
      add :cluster,   :string
      add :timestamp, :integer
      add :pod,       :string
      add :namespace, :string
      add :container, :string
      add :memory,    :float

      timestamps()
    end

    create index(:pod_memory_requests, [:cluster, :namespace, :pod, :container])
    create index(:pod_memory_requests, [:cluster])

    create table(:pod_cpu_requests) do
      add :cluster,   :string
      add :timestamp, :integer
      add :pod,       :string
      add :namespace, :string
      add :container, :string
      add :cpu,       :float

      timestamps()
    end

    create index(:pod_cpu_requests, [:cluster, :namespace, :pod, :container])
    create index(:pod_cpu_requests, [:cluster])

    create table(:pod_cpu) do
      add :cluster,   :string
      add :timestamp, :integer
      add :pod,       :string
      add :namespace, :string
      add :container, :string
      add :cpu,       :float

      timestamps()
    end

    create index(:pod_cpu, [:cluster, :namespace, :pod, :container])
    create index(:pod_cpu, [:cluster])

    create table(:pod_memory) do
      add :cluster,    :string
      add :timestamp,  :integer
      add :pod,        :string
      add :namespace,  :string
      add :container,  :string
      add :memory,     :float

      timestamps()
    end

    create index(:pod_memory, [:cluster, :namespace, :pod, :container])
    create index(:pod_memory, [:cluster])

    create table(:pod_memory_maxes) do
      add :cluster,    :string
      add :timestamp,  :integer
      add :pod,        :string
      add :namespace,  :string
      add :container,  :string
      add :memory,     :float

      timestamps()
    end

    create index(:pod_memory_maxes, [:cluster, :namespace, :pod, :container])
    create index(:pod_memory_maxes, [:cluster])

    create table(:pod_ownerships) do
      add :cluster,   :string
      add :pod,       :string
      add :namespace, :string
      add :type,      :integer
      add :owner,     :string

      timestamps()
    end

    create unique_index(:pod_ownerships, [:cluster, :namespace, :pod])
    create index(:pod_ownerships, [:cluster, :type, :owner])
  end
end
