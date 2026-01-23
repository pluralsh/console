defmodule ConsoleWeb.OpenAPI.AI.AgentSessionControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#show/2" do
    test "returns the agent session if user owns it", %{conn: conn} do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)
      session = insert(:agent_session, thread: thread, type: :terraform)

      result =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/sessions/#{session.id}")
        |> json_response(200)

      assert result["id"] == session.id
      assert result["type"] == "terraform"
    end

    test "it 404s if user does not own the session", %{conn: conn} do
      user = insert(:user)
      other_user = insert(:user)
      thread = insert(:chat_thread, user: other_user)
      session = insert(:agent_session, thread: thread)

      assert_raise Ecto.NoResultsError, fn ->
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/sessions/#{session.id}")
        |> json_response(404)
      end
    end
  end

  describe "#index/2" do
    test "returns the list of agent sessions for the current user", %{conn: conn} do
      user = insert(:user)
      sessions = for _ <- 1..3, do: insert(:agent_session, thread: build(:chat_thread, user: user), type: :terraform)

      other_user = insert(:user)
      for _ <- 1..2, do: insert(:agent_session, thread: build(:chat_thread, user: other_user), type: :kubernetes)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/sessions")
        |> json_response(200)

      assert ids_equal(results, sessions)
    end

    test "supports pagination", %{conn: conn} do
      user = insert(:user)
      for _ <- 1..5, do: insert(:agent_session, thread: build(:chat_thread, user: user), type: :terraform)

      %{"data" => results} =
        conn
        |> add_auth_headers(user)
        |> get("/v1/api/ai/sessions?page=1&per_page=2")
        |> json_response(200)

      assert length(results) == 2
    end
  end

  describe "#create/2" do
    test "cannot create a provisioning agent session", %{conn: conn} do
      user = insert(:user)

      conn
      |> add_auth_headers(user)
      |> json_post("/v1/api/ai/sessions", %{
        prompt: "Set up a kubernetes cluster in AWS",
        type: "provisioning"
      })
      |> json_response(422)
    end

    test "creates a terraform agent session", %{conn: conn} do
      user = insert(:user)

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/ai/sessions", %{
          prompt: "Create a new terraform module for EKS",
          type: "terraform"
        })
        |> json_response(200)

      assert result["id"]
      assert result["type"] == "terraform"
    end

    test "creates a kubernetes agent session", %{conn: conn} do
      user = insert(:user)

      result =
        conn
        |> add_auth_headers(user)
        |> json_post("/v1/api/ai/sessions", %{
          prompt: "Debug the failing pods in production",
          type: "kubernetes"
        })
        |> json_response(200)

      assert result["id"]
      assert result["type"] == "kubernetes"
    end
  end
end
