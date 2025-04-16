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
    test "it can handle group memberships", %{conn: conn} do
      hook = insert(:scm_webhook, type: :github)
      group = insert(:group, name: "some-org:some-group")
      user = insert(:user)

      payload = Jason.encode!(%{
        "action" => "membership",
        "organization" => %{"name" => "some-org"},
        "team" => %{"name" => "some-group"},
        "member" => %{"email" => user.email}
      })
      hmac = :crypto.mac(:hmac, :sha256, hook.hmac, payload)
             |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hub-signature-256", "sha256=#{hmac}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/github/#{hook.external_id}", payload)
      |> response(200)

      assert Console.Services.Users.get_group_member(group.id, user.id)
    end

    test "it will ignore if the group membership if the group isn't precreated", %{conn: conn} do
      hook = insert(:scm_webhook, type: :github)
      insert(:user)

      payload = Jason.encode!(%{
        "action" => "membership",
        "organization" => %{"name" => "some-org"},
        "team" => %{"name" => "some-group"}
      })
      hmac = :crypto.mac(:hmac, :sha256, hook.hmac, payload)
             |> Base.encode16(case: :lower)

      result =
        conn
        |> put_req_header("x-hub-signature-256", "sha256=#{hmac}")
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/github/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["ignored"]
    end

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

      assert_receive {:event, %Console.PubSub.ScmWebhook{item: %{"pull_request" => %{}}, actor: sender}}
      assert sender.id == hook.id
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

    test "it can detect and create flow prs", %{conn: conn} do
      flow = insert(:flow, name: "flow-test")
      hook = insert(:scm_webhook)
      url = "https://github.com/pr/url"

      payload = Jason.encode!(%{"pull_request" => %{
        "html_url" => url,
        "title" => "some title",
        "body" => "some body\nPlural Flow: flow-test",
        "head" => %{"ref" => "some-branch"}
      }})
      hmac = :crypto.mac(:hmac, :sha256, hook.hmac, payload)
             |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hub-signature-256", "sha256=#{hmac}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/github/#{hook.external_id}", payload)
      |> response(200)

      %{id: id} = pr = Console.Repo.get_by(Console.Schema.PullRequest, url: url)
      assert pr.flow_id == flow.id

      assert_receive {:event, %Console.PubSub.PullRequestCreated{item: %{id: ^id}}}
    end
  end

  describe "#observability/2" do
    test "it will ignore if no associated plural resource is found (grafana)", %{conn: conn} do
      hook = insert(:observability_webhook, type: :grafana)

      conn
      |> put_req_header("authorization", Plug.BasicAuth.encode_basic_auth("plrl", hook.secret))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/observability/grafana/#{hook.external_id}", String.trim(Console.conf(:grafana_webhook_payload)))
      |> response(200)

      [] = Console.Repo.all(Console.Schema.Alert)
    end

    test "it will ignore if no associated plural resource is found (pagerduty)", %{conn: conn} do
      hook = insert(:observability_webhook, type: :pagerduty)

      conn
      |> put_req_header("authorization", Plug.BasicAuth.encode_basic_auth("plrl", hook.secret))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/observability/pagerduty/#{hook.external_id}", String.trim(Console.conf(:pagerduty_webhook_payload)))
      |> response(200)

      [] = Console.Repo.all(Console.Schema.Alert)
    end

    test "it will ignore if no associated plural resource is found (datadog)", %{conn: conn} do
      hook = insert(:observability_webhook, type: :datadog)

      conn
      |> put_req_header("authorization", Plug.BasicAuth.encode_basic_auth("plrl", hook.secret))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/observability/datadog/#{hook.external_id}", String.trim(Console.conf(:datadog_webhook_firing_payload)))
      |> response(200)

      [] = Console.Repo.all(Console.Schema.Alert)
    end

    test "it can handle payloads with text in body (grafana)", %{conn: conn} do
      hook = insert(:observability_webhook, type: :grafana)
      svc = insert(:service)

      %{"alerts" => [alert | _]} = webhook = String.trim(Console.conf(:grafana_webhook_payload)) |> Jason.decode!()
      alert = put_in(alert["annotations"]["summary"], "alert on\nPlural Service: #{svc.name}\nPlural Cluster: #{svc.cluster.handle}")
      webhook = Map.put(webhook, "alerts", [alert])

      conn
      |> put_req_header("authorization", Plug.BasicAuth.encode_basic_auth("plrl", hook.secret))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/observability/grafana/#{hook.external_id}", Jason.encode!(webhook))
      |> response(200)

      [alert] = Console.Repo.all(Console.Schema.Alert)

      assert alert.service_id == svc.id
      assert_receive {:event, %Console.PubSub.AlertCreated{}}
    end

    test "it can handle payloads with text in body (pagerduty)", %{conn: conn} do
      hook = insert(:observability_webhook, type: :pagerduty)
      svc = insert(:service)

      webhook = String.trim(Console.conf(:pagerduty_webhook_payload)) |> Jason.decode!()

      # Add custom details to the PagerDuty payload
      webhook = put_in(webhook, ["event", "data", "custom_details"], %{
        "plrl_service" => svc.name,
        "plrl_cluster" => svc.cluster.handle,
        "plrl_project" => "test-project"
      })

      conn
      |> put_req_header("authorization", Plug.BasicAuth.encode_basic_auth("plrl", hook.secret))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/observability/pagerduty/#{hook.external_id}", Jason.encode!(webhook))
      |> response(200)

      [alert] = Console.Repo.all(Console.Schema.Alert)

      assert alert.service_id == svc.id
      assert_receive {:event, %Console.PubSub.AlertCreated{}}
    end

    test "it can handle payloads with text in body (datadog)", %{conn: conn} do
      hook = insert(:observability_webhook, type: :datadog)
      svc = insert(:service)

      webhook = String.trim(Console.conf(:datadog_webhook_firing_payload)) |> Jason.decode!()

      tags = [
        "plrl_service:#{svc.name}",
        "plrl_cluster:#{svc.cluster.handle}",
        "plrl_project:test-project"
      ]

      message = """
      Alert triggered for service: #{svc.name}
      Cluster: #{svc.cluster.handle}
      Project: test-project
      """

      webhook = case webhook do
        %{"alerts" => [alert | rest]} ->
          updated_alert = alert
            |> Map.put("tags", tags)
            |> Map.put("message", message)
          %{webhook | "alerts" => [updated_alert | rest]}

        %{"event" => event} ->
          updated_event = event
            |> Map.put("tags", tags)
            |> Map.put("message", message)
          %{webhook | "event" => updated_event}

        _ ->
          webhook
          |> Map.put("tags", tags)
          |> Map.put("message", message)
      end

      conn
      |> put_req_header("authorization", Plug.BasicAuth.encode_basic_auth("plrl", hook.secret))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/observability/datadog/#{hook.external_id}", Jason.encode!(webhook))
      |> response(200)

      [alert] = Console.Repo.all(Console.Schema.Alert)

      assert alert.service_id == svc.id
      assert_receive {:event, %Console.PubSub.AlertCreated{}}
    end
  end
end
