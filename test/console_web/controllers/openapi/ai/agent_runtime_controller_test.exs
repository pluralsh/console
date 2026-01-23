defmodule ConsoleWeb.OpenAPI.AI.AgentRuntimeControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#show/2" do
    test "returns the agent runtime if user has create bindings", %{conn: conn} do
      user = insert(:user)
      runtime = insert(:agent_runtime, create_bindings: [%{user_id: user.id}])

      result =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/ai/runtimes/#{runtime.id}")
        |> json_response(200)

      assert result["id"] == runtime.id
      assert result["name"] == runtime.name
      assert result["type"] == to_string(runtime.type)
    end

    test "returns the agent runtime for admin users", %{conn: conn} do
      runtime = insert(:agent_runtime)

      result =
        conn
        |> add_auth_headers(admin_user())
        |> get("/api/v1/ai/runtimes/#{runtime.id}")
        |> json_response(200)

      assert result["id"] == runtime.id
    end

    test "it 403s if user does not have bindings", %{conn: conn} do
      user = insert(:user)
      runtime = insert(:agent_runtime)

      conn
      |> add_auth_headers(user)
      |> get("/api/v1/ai/runtimes/#{runtime.id}")
      |> json_response(403)
    end
  end

  describe "#index/2" do
    test "returns the list of agent runtimes user has access to", %{conn: conn} do
      user = insert(:user)
      runtimes = insert_list(3, :agent_runtime, create_bindings: [%{user_id: user.id}])
      insert_list(2, :agent_runtime)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/ai/runtimes")
        |> json_response(200)

      assert ids_equal(results, runtimes)
    end

    test "filters by type", %{conn: conn} do
      user = insert(:user)
      claude_runtime = insert(:agent_runtime, type: :claude, create_bindings: [%{user_id: user.id}])
      insert(:agent_runtime, type: :gemini, create_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/ai/runtimes?type=claude")
        |> json_response(200)

      assert length(results) == 1
      assert hd(results)["id"] == claude_runtime.id
    end

    test "supports pagination", %{conn: conn} do
      user = insert(:user)
      insert_list(5, :agent_runtime, create_bindings: [%{user_id: user.id}])

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/api/v1/ai/runtimes?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end

    test "admin users can see all runtimes", %{conn: conn} do
      runtimes = insert_list(3, :agent_runtime)

      %{"data" => results} =
        conn
        |> add_auth_headers(admin_user())
        |> get("/api/v1/ai/runtimes")
        |> json_response(200)

      assert ids_equal(results, runtimes)
    end
  end
end
