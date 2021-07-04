defmodule ConsoleWeb.WebhookControllerTest do
  use ConsoleWeb.ConnCase, async: true
  use Mimic

  describe "#webhook/2" do
    test "it'll succeed if the signature is valid", %{conn: conn} do
      insert(:user, bot_name: "console")
      path   = Routes.webhook_path(conn, :webhook)
      secret = Console.conf(:webhook_secret)
      body   = Jason.encode!(%{repository: "plural", message: "Some message"})
      myself = self()

      expect(Console.Deployer, :wake, fn ->
        send myself, :wake
      end)

      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{metadata: %{name: "plural"}}} end)

      conn
      |> put_req_header("x-watchman-signature", "sha1=#{Console.hmac(secret, body)}")
      |> put_req_header("content-type", "application/json")
      |> post(path, body)
      |> json_response(200)

      assert_receive :wake
      {:ok, build} = Console.Services.Builds.poll(Ecto.UUID.generate())
      assert build.repository == "plural"
      assert build.message == "Some message"
    end

    test "It will fail on invalid signatures", %{conn: conn} do
      path = Routes.webhook_path(conn, :webhook)
      body = Jason.encode!(%{repository: "plural"})

      conn
      |> put_req_header("x-watchman-signature", "sha1=bogus")
      |> put_req_header("content-type", "application/json")
      |> post(path, body)
      |> response(403)
    end
  end

  describe "#piazza/2" do
    test "it'll succeed if the signature is valid", %{conn: conn} do
      insert(:user, bot_name: "console")
      path   = Routes.webhook_path(conn, :piazza)
      secret = Console.conf(:piazza_secret)
      body   = Jason.encode!(%{text: "/console deploy plural"})
      sig    = Console.sha("#{body}:bogus:#{secret}")
      myself = self()

      expect(Console.Deployer, :wake, fn ->
        send myself, :wake
      end)

      expect(Kazan, :run, fn _ -> {:ok, %Kube.Application{metadata: %{name: "plural"}}} end)

      conn
      |> put_req_header("x-piazza-timestamp", "bogus")
      |> put_req_header("x-piazza-signature", sig)
      |> put_req_header("content-type", "application/json")
      |> post(path, body)
      |> json_response(200)

      assert_receive :wake
      {:ok, build} = Console.Services.Builds.poll(Ecto.UUID.generate())
      assert build.type == :deploy
      assert build.repository == "plural"
      assert build.message == "Deployed from piazza"
    end

    test "It will fail on invalid signatures", %{conn: conn} do
      path = Routes.webhook_path(conn, :webhook)
      body = Jason.encode!(%{repository: "plural"})

      conn
      |> put_req_header("x-piazza-timestamp", "bogus")
      |> put_req_header("x-piazza-signature", "bogus")
      |> put_req_header("content-type", "application/json")
      |> post(path, body)
      |> response(403)
    end
  end
end
