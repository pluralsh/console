defmodule WatchmanWeb.WebhookControllerTest do
  use WatchmanWeb.ConnCase, async: true
  use Mimic

  describe "#webhook/2" do
    test "it'll succeed if the signature is valid", %{conn: conn} do
      insert(:user, bot_name: "watchman")
      path   = Routes.webhook_path(conn, :webhook)
      secret = Watchman.conf(:webhook_secret)
      body   = Jason.encode!(%{repository: "forge", message: "Some message"})
      myself = self()

      expect(Watchman.Deployer, :wake, fn ->
        send myself, :wake
      end)

      expect(Kazan, :run, fn _ -> {:ok, %Watchman.Kube.Application{metadata: %{name: "forge"}}} end)

      conn
      |> put_req_header("x-watchman-signature", "sha1=#{Watchman.hmac(secret, body)}")
      |> put_req_header("content-type", "application/json")
      |> post(path, body)
      |> json_response(200)

      assert_receive :wake
      build = Watchman.Services.Builds.poll()
      assert build.repository == "forge"
      assert build.message == "Some message"
    end

    test "It will fail on invalid signatures", %{conn: conn} do
      path = Routes.webhook_path(conn, :webhook)
      body = Jason.encode!(%{repository: "forge"})

      conn
      |> put_req_header("x-watchman-signature", "sha1=bogus")
      |> put_req_header("content-type", "application/json")
      |> post(path, body)
      |> response(403)
    end
  end

  describe "#piazza/2" do
    test "it'll succeed if the signature is valid", %{conn: conn} do
      insert(:user, bot_name: "watchman")
      path   = Routes.webhook_path(conn, :piazza)
      secret = Watchman.conf(:piazza_secret)
      body   = Jason.encode!(%{text: "/watchman deploy forge"})
      sig    = Watchman.sha("#{body}:bogus:#{secret}")
      myself = self()

      expect(Watchman.Deployer, :wake, fn ->
        send myself, :wake
      end)

      expect(Kazan, :run, fn _ -> {:ok, %Watchman.Kube.Application{metadata: %{name: "forge"}}} end)

      conn
      |> put_req_header("x-piazza-timestamp", "bogus")
      |> put_req_header("x-piazza-signature", sig)
      |> put_req_header("content-type", "application/json")
      |> post(path, body)
      |> json_response(200)

      assert_receive :wake
      build = Watchman.Services.Builds.poll()
      assert build.type == :deploy
      assert build.repository == "forge"
      assert build.message == "Deployed from piazza"
    end

    test "It will fail on invalid signatures", %{conn: conn} do
      path = Routes.webhook_path(conn, :webhook)
      body = Jason.encode!(%{repository: "forge"})

      conn
      |> put_req_header("x-piazza-timestamp", "bogus")
      |> put_req_header("x-piazza-signature", "bogus")
      |> put_req_header("content-type", "application/json")
      |> post(path, body)
      |> response(403)
    end
  end
end
