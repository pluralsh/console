defmodule ConsoleWeb.OpenAPI.AI.WorkbenchJobControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#show/2" do
    test "returns the workbench job with result sideloaded when user has access", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      job = insert(:workbench_job, workbench: workbench, user: user, prompt: "test prompt")

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/workbenches/jobs/#{job.id}")
        |> json_response(200)

      assert result["id"] == job.id
      assert result["prompt"] == job.prompt
      assert result["status"] == to_string(job.status)
      assert result["result"]
      assert Map.has_key?(result["result"], "working_theory")
      assert Map.has_key?(result["result"], "conclusion")
    end

    test "returns the workbench job for admin users", %{conn: conn} do
      job = insert(:workbench_job)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/workbenches/jobs/#{job.id}")
        |> json_response(200)

      assert result["id"] == job.id
      assert result["result"]
    end

    test "403s if user does not have access", %{conn: conn} do
      user = insert(:user)
      job = insert(:workbench_job)

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/ai/workbenches/jobs/#{job.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of workbench jobs with result sideloaded", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)
      jobs = insert_list(3, :workbench_job, workbench: workbench, user: user)
      insert_list(2, :workbench_job)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/workbenches/#{workbench.id}/jobs")
        |> json_response(200)

      assert ids_equal(results, jobs)
      assert Enum.all?(results, &Map.has_key?(&1, "result"))
    end

    test "403s if user does not have access to the workbench", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench)
      insert(:workbench_job, workbench: workbench)

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/ai/workbenches/#{workbench.id}/jobs")
      |> json_response(403)
    end

    test "supports pagination", %{conn: conn} do
      workbench = insert(:workbench)
      insert_list(5, :workbench_job, workbench: workbench)

      %{"data" => results} =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/workbenches/#{workbench.id}/jobs?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#create/2" do
    test "creates a workbench job with result sideloaded", %{conn: conn} do
      user = insert(:user)
      project = insert(:project, read_bindings: [%{user_id: user.id}])
      workbench = insert(:workbench, project: project)

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/ai/workbenches/#{workbench.id}/jobs", %{prompt: "hello world"})
        |> json_response(200)

      assert result["id"]
      assert result["prompt"] == "hello world"
      assert result["status"] == "pending"
      assert result["workbench_id"] == workbench.id
      assert result["user_id"] == user.id
      assert result["result"]
      refute result["result"]["working_theory"]
      refute result["result"]["conclusion"]
    end

    test "admin users can create workbench jobs", %{conn: conn} do
      workbench = insert(:workbench)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/v1/api/ai/workbenches/#{workbench.id}/jobs", %{prompt: "admin prompt"})
        |> json_response(200)

      assert result["id"]
      assert result["result"]
    end

    test "users without access cannot create workbench jobs", %{conn: conn} do
      user = insert(:user)
      workbench = insert(:workbench)

      conn
      |> add_auth_headers(user)
      |> json_post("/v1/api/ai/workbenches/#{workbench.id}/jobs", %{prompt: "nope"})
      |> json_response(403)
    end
  end
end
