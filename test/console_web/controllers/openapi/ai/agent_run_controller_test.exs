defmodule ConsoleWeb.OpenAPI.AI.AgentRunControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#show/2" do
    test "returns the agent run if user owns it", %{conn: conn} do
      user = insert(:user)
      runtime = insert(:agent_runtime)
      run = insert(:agent_run, user: user, runtime: runtime)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/runs/#{run.id}")
        |> json_response(200)

      assert result["id"] == run.id
      assert result["prompt"] == run.prompt
      assert result["repository"] == run.repository
      assert result["status"] == to_string(run.status)
      assert result["mode"] == to_string(run.mode)
    end

    test "returns the agent run for admin users", %{conn: conn} do
      run = insert(:agent_run)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> get("/v1/api/ai/runs/#{run.id}")
        |> json_response(200)

      assert result["id"] == run.id
    end

    test "it 403s if user does not own the run", %{conn: conn} do
      user = insert(:user)
      run = insert(:agent_run)

      conn
      |> add_auth_headers(user)
      |> get("/v1/api/ai/runs/#{run.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of agent runs for the current user", %{conn: conn} do
      user = insert(:user)
      runtime = insert(:agent_runtime)
      runs = insert_list(3, :agent_run, user: user, runtime: runtime)
      insert_list(2, :agent_run, runtime: runtime)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/runs")
        |> json_response(200)

      assert ids_equal(results, runs)
    end

    test "filters by runtime_id", %{conn: conn} do
      user = insert(:user)
      runtime1 = insert(:agent_runtime)
      runtime2 = insert(:agent_runtime)
      runs1 = insert_list(2, :agent_run, user: user, runtime: runtime1)
      insert_list(2, :agent_run, user: user, runtime: runtime2)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/runs?runtime_id=#{runtime1.id}")
        |> json_response(200)

      assert ids_equal(results, runs1)
    end

    test "supports pagination", %{conn: conn} do
      user = insert(:user)
      runtime = insert(:agent_runtime)
      insert_list(5, :agent_run, user: user, runtime: runtime)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/runs?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#create/2" do
    test "creates an agent run", %{conn: conn} do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/ai/runs", %{
          runtime_id: runtime.id,
          prompt: "Analyze this codebase",
          repository: "https://github.com/pluralsh/console.git",
          mode: "analyze"
        })
        |> json_response(200)

      assert result["id"]
      assert result["prompt"] == "Analyze this codebase"
      assert result["repository"] == "https://github.com/pluralsh/console.git"
      assert result["mode"] == "analyze"
      assert result["status"] == "pending"
    end

    test "creates an agent run with write mode", %{conn: conn} do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/ai/runs", %{
          runtime_id: runtime.id,
          prompt: "Add logging to the auth module",
          repository: "https://github.com/pluralsh/console.git",
          mode: "write"
        })
        |> json_response(200)

      assert result["id"]
      assert result["mode"] == "write"
    end

    test "admin users can create agent runs", %{conn: conn} do
      runtime = insert(:agent_runtime)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> json_post("/v1/api/ai/runs", %{
          runtime_id: runtime.id,
          prompt: "Test prompt",
          repository: "https://github.com/pluralsh/console.git",
          mode: "analyze"
        })
        |> json_response(200)

      assert result["id"]
    end

    test "users without bindings cannot create agent runs", %{conn: conn} do
      user = insert(:user)
      runtime = insert(:agent_runtime)

      conn
      |> add_auth_headers(user)
      |> json_post("/v1/api/ai/runs", %{
        runtime_id: runtime.id,
        prompt: "Test prompt",
        repository: "https://github.com/pluralsh/console.git",
        mode: "analyze"
      })
      |> json_response(403)
    end
  end
end
