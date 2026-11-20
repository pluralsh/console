defmodule ConsoleWeb.AIControllerDevboxTest do
  use ConsoleWeb.ConnCase, async: true
  alias Console.Devboxes.Credentials
  alias Console.Schema.Workbench

  describe "devbox ai proxy tokens" do
    test "it rejects revoked devbox tokens", %{conn: conn} do
      inst = insert(:devbox_instance)
      {:ok, token, _} = Credentials.mint_ai_proxy_token(inst)
      {:ok, _} = Credentials.revoke(inst)

      conn
      |> put_req_header("authorization", "Bearer #{token}")
      |> post("/ext/v1/ai/openai/v1/chat/completions", %{})
      |> response(401)
    end

    test "it returns 402 when the workbench budget is exhausted", %{conn: conn} do
      wb = insert(:workbench, budget: %Workbench.Budget{enabled: true, maximum: 100, min_free: 10, unit: :token, last: 0, last_updated: DateTime.utc_now()})
      inst = insert(:devbox_instance, workbench: wb)
      {:ok, token, _} = Credentials.mint_ai_proxy_token(inst)

      conn
      |> put_req_header("authorization", "Bearer #{token}")
      |> post("/ext/v1/ai/openai/v1/chat/completions", %{})
      |> response(402)
    end
  end

  describe "devbox console tokens" do
    test "it accepts the console token egress injects on the console host", %{conn: conn} do
      inst = insert(:devbox_instance)
      {:ok, token, _} = Credentials.console_token(inst)

      body =
        conn
        |> put_req_header("authorization", "Bearer #{token}")
        |> post("/ext/v1/ai/openai/v1/chat/completions", %{})
        |> response(402)

      assert body =~ "ai proxy config error"
    end

    test "it rejects console tokens of ended instances and plain user tokens", %{conn: conn} do
      inst = insert(:devbox_instance)
      {:ok, ended, _} = Credentials.console_token(inst)
      {:ok, _} = Console.Devboxes.end_instance(inst, :cancelled, "test")
      {:ok, user_token, _} = Console.Guardian.encode_and_sign(insert(:user))

      for token <- [ended, user_token] do
        conn
        |> put_req_header("authorization", "Bearer #{token}")
        |> post("/ext/v1/ai/openai/v1/chat/completions", %{})
        |> response(401)
      end
    end

    test "it returns 402 when the workbench budget is exhausted", %{conn: conn} do
      wb = insert(:workbench, budget: %Workbench.Budget{enabled: true, maximum: 100, min_free: 10, unit: :token, last: 0, last_updated: DateTime.utc_now()})
      inst = insert(:devbox_instance, workbench: wb)
      {:ok, token, _} = Credentials.console_token(inst)

      body =
        conn
        |> put_req_header("authorization", "Bearer #{token}")
        |> post("/ext/v1/ai/openai/v1/chat/completions", %{})
        |> response(402)

      assert body == "workbench budget is exhausted"
    end
  end
end
