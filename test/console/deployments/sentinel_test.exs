defmodule Console.Deployments.SentinelTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Sentinels
  alias Console.Schema.SentinelRunJob

  describe "create_sentinel/2" do
    test "project writers can create a sentinel" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])

      {:ok, sentinel} = Sentinels.create_sentinel(%{
        name: "test",
        checks: [%{type: :log, name: "test",configuration: %{log: %{namespace: "test", duration: "1h", query: "error"}}}],
        project_id: project.id,
      }, user)

      assert sentinel.project_id == project.id
      assert length(sentinel.checks) == 1
    end

    test "project readers cannot create a sentinel" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])

      {:error, _} = Sentinels.create_sentinel(%{
        name: "test",
        checks: [%{type: :log, name: "test", configuration: %{log: %{namespace: "test", duration: "1h", query: "error"}}}],
        project_id: project.id,
      }, user)
    end
  end

  describe "update_sentinel/3" do
    test "project writers can update a sentinel" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      {:ok, sentinel} = Sentinels.update_sentinel(%{
        name: "test",
        checks: [%{type: :log, name: "test", configuration: %{log: %{namespace: "test", duration: "1h", query: "error"}}}],
        project_id: project.id,
      }, sentinel.id, user)

      assert sentinel.name == "test"
      assert length(sentinel.checks) == 1
      assert sentinel.project_id == project.id
    end

    test "project readers cannot update a sentinel" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      {:error, _} = Sentinels.update_sentinel(%{
        name: "test",
        checks: [%{type: :log, name: "test",configuration: %{log: %{namespace: "test", duration: "1h", query: "error"}}}],
        project_id: project.id,
      }, sentinel.id, user)
    end
  end

  describe "delete_sentinel/2" do
    test "project writers can delete a sentinel" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      {:ok, deleted} = Sentinels.delete_sentinel(sentinel.id, user)

      assert deleted.id == sentinel.id
      refute refetch(sentinel)
    end

    test "project readers cannot delete a sentinel" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)

      {:error, _} = Sentinels.delete_sentinel(sentinel.id, user)

      assert refetch(sentinel)
    end
  end

  describe "run_sentinel/2" do
    test "project writers can run a sentinel" do
      user = insert(:user)
      project = insert(:project, write_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project, checks: [
        %{type: :log, name: "test", configuration: %{log: %{namespace: "test", duration: "1h", query: "error"}}}
      ])

      {:ok, run} = Sentinels.run_sentinel(sentinel.id, user)

      assert run.sentinel_id == sentinel.id
      assert run.status == :pending
      assert length(run.checks) == 1

      assert refetch(sentinel).last_run_at
    end

    test "non project readers cannot run a sentinel" do
      user = insert(:user)
      project = insert(:project)
      sentinel = insert(:sentinel, project: project)

      {:error, _} = Sentinels.run_sentinel(sentinel.id, user)

      assert refetch(sentinel)
    end
  end

  describe "#spawn_jobs/2" do
    test "it can create job runs in all matching clusters" do
      sentinel = insert(:sentinel,
        checks: [%{
          type: :integration_test,
          name: "test",
          configuration: %{
            integration_test: %{
              format: :junit,
              job: %{
                namespace: "test",
              },
              tags: %{"tier" => "dev"},
              distro: :eks
            }
          }
        }]
      )
      run = insert(:sentinel_run, sentinel: sentinel, checks: Console.mapify(sentinel.checks))
      clusters = insert_list(3, :cluster, distro: :eks, tags: [%{name: "tier", value: "dev"}])
      insert_list(2, :cluster, distro: :aks, tags: [%{name: "tier", value: "dev"}])
      insert_list(2, :cluster, distro: :eks, tags: [%{name: "tier", value: "prod"}])

      {:ok, 3} = Sentinels.spawn_jobs(run, "test")

      jobs = Repo.all(SentinelRunJob)

      assert MapSet.new(jobs, & &1.cluster_id)
             |> MapSet.equal?(MapSet.new(clusters, & &1.id))
      assert Enum.all?(jobs, & &1.sentinel_run_id == run.id)
      assert Enum.all?(jobs, & &1.job.namespace == "test")
    end
  end

  describe "#update_sentinel_job/3" do
    test "clusters can update their own run jobs" do
      cluster = insert(:cluster)
      job = insert(:sentinel_run_job, cluster: cluster)

      {:ok, updated} = Sentinels.update_sentinel_job(%{status: :success}, job.id, cluster)

      assert updated.status == :success
      assert updated.id == job.id

      {:error, _} = Sentinels.update_sentinel_job(%{status: :success}, job.id, insert(:cluster))
    end
  end
end
