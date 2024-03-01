defmodule ConsoleWeb.WebhookControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#alertmanager/2" do
    test "it can accept an alertmanager webhook", %{conn: conn} do
      conn
      |> post("/alertmanager", %{})
      |> response(200)
    end
  end

  describe "#scm/2" do
    test "it can process a github pr webhook", %{conn: conn} do
      hook = insert(:scm_webhook)
      pr = insert(:pull_request)

      payload = Jason.encode!(%{"pull_request" => %{"html_url" => pr.url, "merged" => true}})
      hmac = :crypto.mac(:hmac, :sha256, hook.hmac, payload)
             |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hub-signature-256", "sha256=#{hmac}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/github/#{hook.external_id}", payload)
      |> response(200)

      assert refetch(pr).status == :merged
    end
  end
end
