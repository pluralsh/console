defmodule Console.AI.Tools.Workbench.Sentinel.ToolsTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Sentinel.{
    FetchSentinelRun,
    FetchSentinelRunJob,
    ListSentinels,
    ListSentinelRuns,
    ListSentinelRunJobs,
    RunSentinel
  }
  alias Console.Schema.SentinelRun

  describe "ListSentinels (plrl_list_sentinels)" do
    test "returns json for sentinels readable by the user" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, name: "alpha-sentinel", status: :success, project: project)
      other = insert(:sentinel, name: "beta-sentinel", status: :success)

      assert {:ok, parsed} =
               Tool.validate(%ListSentinels{user: user}, %{
                 "q" => "alpha",
                 "status" => "success",
                 "limit" => 10
               })

      assert {:ok, json} = ListSentinels.implement(parsed)
      assert {:ok, list} = Jason.decode(json)
      assert Enum.any?(list, &(&1["id"] == sentinel.id))
      refute Enum.any?(list, &(&1["id"] == other.id))

      assert [%{"checks" => checks}] = list
      assert is_list(checks)
    end
  end

  describe "FetchSentinelRun (plrl_sentinel_run)" do
    test "returns compact run json with job id and status only" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)
      run = insert(:sentinel_run, sentinel: sentinel, status: :failed)
      job = insert(:sentinel_run_job, sentinel_run: run, status: :failed, output: "long job output")

      assert {:ok, parsed} =
               Tool.validate(%FetchSentinelRun{user: user}, %{
                 "sentinel_run_id" => run.id
               })

      assert {:ok, json} = FetchSentinelRun.implement(parsed)
      assert {:ok, found} = Jason.decode(json)

      assert found["id"] == run.id
      assert found["status"] == "failed"
      assert [%{"id" => job_id, "status" => "failed"} = encoded_job] = found["jobs"]
      assert job_id == job.id
      refute Map.has_key?(encoded_job, "output")
    end
  end

  describe "FetchSentinelRunJob (plrl_sentinel_run_job)" do
    test "returns markdown including run job output" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)
      run = insert(:sentinel_run, sentinel: sentinel)

      job =
        insert(:sentinel_run_job,
          sentinel_run: run,
          status: :success,
          format: :plaintext,
          output: "integration test output"
        )

      assert {:ok, parsed} =
               Tool.validate(%FetchSentinelRunJob{user: user}, %{
                 "sentinel_run_job_id" => job.id
               })

      assert {:ok, markdown} = FetchSentinelRunJob.implement(parsed)
      assert markdown =~ "# Sentinel Run Job"
      assert markdown =~ "- ID: `#{job.id}`"
      assert markdown =~ "- Status: `success`"
      assert markdown =~ "integration test output"
    end
  end

  describe "ListSentinelRuns (plrl_sentinel_runs)" do
    test "returns the sentinel's runs, newest first, filtered by status" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      sentinel = insert(:sentinel, project: project)
      old = insert(:sentinel_run, sentinel: sentinel, status: :failed, inserted_at: Timex.now() |> Timex.shift(hours: -2))
      new = insert(:sentinel_run, sentinel: sentinel, status: :failed)
      insert(:sentinel_run, sentinel: sentinel, status: :success)
      insert(:sentinel_run, status: :failed)

      assert {:ok, parsed} =
               Tool.validate(%ListSentinelRuns{user: user}, %{
                 "sentinel_id" => sentinel.id,
                 "status" => "failed"
               })

      assert {:ok, json} = ListSentinelRuns.implement(parsed)
      assert {:ok, runs} = Jason.decode(json)
      assert Enum.map(runs, & &1["id"]) == [new.id, old.id]
      refute Map.has_key?(hd(runs), "jobs")
    end

    test "it rejects users who can't read the sentinel" do
      sentinel = insert(:sentinel)

      assert {:ok, parsed} = Tool.validate(%ListSentinelRuns{user: insert(:user)}, %{"sentinel_id" => sentinel.id})
      assert {:error, _} = ListSentinelRuns.implement(parsed)
    end
  end

  describe "ListSentinelRunJobs (plrl_sentinel_run_jobs)" do
    test "returns the run's jobs filtered by status and cluster handle, with errors" do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      run = insert(:sentinel_run, sentinel: insert(:sentinel, project: project))
      cluster = insert(:cluster, handle: "prod-usw2")
      job = insert(:sentinel_run_job, sentinel_run: run, cluster: cluster, status: :failed, error: "pod was OOMKilled")
      insert(:sentinel_run_job, sentinel_run: run, status: :failed)
      insert(:sentinel_run_job, sentinel_run: run, cluster: cluster, status: :success)

      assert {:ok, parsed} =
               Tool.validate(%ListSentinelRunJobs{user: user}, %{
                 "sentinel_run_id" => run.id,
                 "status" => "failed",
                 "cluster" => "prod-usw2"
               })

      assert {:ok, json} = ListSentinelRunJobs.implement(parsed)
      assert {:ok, [found]} = Jason.decode(json)
      assert found["id"] == job.id
      assert found["error"] == "pod was OOMKilled"
      assert found["cluster"]["handle"] == "prod-usw2"
      refute Map.has_key?(found, "output")
    end
  end

  describe "RunSentinel (plrl_run_sentinel)" do
    test "loads the sentinel onto the tool struct without creating a run" do
      user = insert(:user)
      sentinel = insert(:sentinel, name: "deploy-smoke")
      before_count = Repo.aggregate(SentinelRun, :count, :id)

      assert {:ok, parsed} =
               Tool.validate(%RunSentinel{user: user}, %{
                 "name" => "deploy-smoke",
                 "overrides" => %{"tags" => %{"suite" => "smoke"}}
               })

      assert {:ok, %RunSentinel{sentinel: loaded, overrides: overrides}} = RunSentinel.implement(parsed)
      assert loaded.id == sentinel.id
      assert overrides == %{"tags" => %{"suite" => "smoke"}}
      assert Repo.aggregate(SentinelRun, :count, :id) == before_count
    end
  end
end
