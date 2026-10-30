defmodule Console.Repo.Migrations.FixPullRequestFkCascades do
  use Ecto.Migration

  def change do
    alter table(:pull_requests) do
      modify :cluster_id, references(:clusters, type: :uuid, on_delete: :nilify_all),
        from: references(:clusters, type: :uuid, on_delete: :delete_all)
      modify :service_id, references(:services, type: :uuid, on_delete: :nilify_all),
        from: references(:services, type: :uuid, on_delete: :delete_all)
      modify :stack_run_id, references(:stack_runs, type: :uuid, on_delete: :nilify_all),
        from: references(:stack_runs, type: :uuid, on_delete: :nothing)
    end

    alter table(:preview_environment_instances) do
      modify :pull_request_id, references(:pull_requests, type: :binary_id, on_delete: :nilify_all),
        from: references(:pull_requests, type: :binary_id)
    end
  end
end
