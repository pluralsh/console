defmodule ConsoleWeb.WebhookControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#cluster/2" do
    test "it can handle a dashboard cluster id request", %{conn: conn} do
      cluster = insert(:cluster)
      user = insert(:user)

      {:ok, token, _} = Console.Guardian.encode_and_sign(user, %{})

      resp =
        conn
        |> put_req_header("authorization", "Bearer plrl:#{cluster.id}:#{token}")
        |> get("/v1/dashboard/cluster")
        |> response(200)

      assert resp == cluster.id
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

    test "it can detect and create stack prs", %{conn: conn} do
      stack = insert(:stack)
      hook = insert(:scm_webhook)
      url = "https://github.com/pr/url"

      payload = Jason.encode!(%{"pull_request" => %{
        "html_url" => url,
        "title" => "some title",
        "head" => %{"ref" => "plrl/stack/#{stack.name}"}
      }})
      hmac = :crypto.mac(:hmac, :sha256, hook.hmac, payload)
             |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hub-signature-256", "sha256=#{hmac}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/github/#{hook.external_id}", payload)
      |> response(200)

      %{id: id} = pr = Console.Repo.get_by(Console.Schema.PullRequest, url: url)
      assert pr.stack_id == stack.id

      assert_receive {:event, %Console.PubSub.PullRequestCreated{item: %{id: ^id}}}
    end
  end
end
