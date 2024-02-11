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

      conn
      |> post("/ext/v1/webhooks/github/#{hook.id}", %{"pull_request" => %{"html_url" => pr.url, "merged" => true}})
      |> response(200)

      assert refetch(pr).status == :merged
    end
  end
end
