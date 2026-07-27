defmodule Console.AI.Tools.Workbench.Sentinel.ToolsTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.Sentinel.{
    FetchSentinelRun,
    FetchSentinelRunJob,
    ListSentinels,
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
