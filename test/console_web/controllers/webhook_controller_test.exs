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
    test "it returns 403 for azure devops webhook without valid basic auth", %{conn: conn} do
      hook = insert(:scm_webhook, type: :azure_devops)
      payload = Jason.encode!(%{})

      conn
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/azure_devops/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it returns 200 for azure devops webhook with valid basic auth", %{conn: conn} do
      hook = insert(:scm_webhook, type: :azure_devops)
      payload = Jason.encode!(%{})

      conn
      |> put_req_header("authorization", Plug.BasicAuth.encode_basic_auth("plrl", hook.hmac))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/azure_devops/#{hook.external_id}", payload)
      |> response(200)
    end

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

    test "it can associate a flow with a pr and preview environment", %{conn: conn} do
      hook = insert(:scm_webhook)
      pr   = insert(:pull_request)
      flow = insert(:flow)

      payload = Jason.encode!(%{
        "pull_request" => %{
          "html_url" => pr.url,
          "body" => """
          Plural Flow: #{flow.name}
          Plural Preview: test
          """
        }
      })
      hmac = :crypto.mac(:hmac, :sha256, hook.hmac, payload)
             |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hub-signature-256", "sha256=#{hmac}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/github/#{hook.external_id}", payload)
      |> response(200)

      pr = refetch(pr)
      assert pr.flow_id == flow.id
      assert pr.preview == "test"
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

    test "it can detect merge crons", %{conn: conn} do
      hook = insert(:scm_webhook)
      url = "https://github.com/pr/url"
      pr = insert(:pull_request, url: url)

      payload = Jason.encode!(%{"pull_request" => %{
        "html_url" => url,
        "title" => "some title",
        "body" => "some body\nPlural merge cron: 0 0 * * *",
        "head" => %{"ref" => "some-branch"}
      }})
      hmac = :crypto.mac(:hmac, :sha256, hook.hmac, payload)
             |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hub-signature-256", "sha256=#{hmac}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/github/#{hook.external_id}", payload)
      |> response(200)

      updated = refetch(pr)
      assert updated.merge_cron == "0 0 * * *"
      assert updated.merge_attempt_at
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
      payload = String.trim(Console.conf(:pagerduty_webhook_payload))

      # Calculate the signature (see https://developer.pagerduty.com/docs/verifying-webhook-signatures)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)
                  |> then(fn sig -> "v1=#{sig}" end)

      conn
      |> put_req_header("x-pagerduty-signature", signature)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/observability/pagerduty/#{hook.external_id}", payload)
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

    test "it will ignore if no associated plural resource is found (newrelic)", %{conn: conn} do
      hook = insert(:observability_webhook, type: :newrelic)

      conn
      |> put_req_header("authorization", Plug.BasicAuth.encode_basic_auth("plrl", hook.secret))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/observability/newrelic/#{hook.external_id}", String.trim(Console.conf(:newrelic_webhook_payload)))
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

      # Convert to JSON string
      payload = Jason.encode!(webhook)

      # Calculate the signature (see https://developer.pagerduty.com/docs/verifying-webhook-signatures)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)
                  |> then(fn sig -> "v1=#{sig}" end)

      conn
      |> put_req_header("x-pagerduty-signature", signature)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/observability/pagerduty/#{hook.external_id}", payload)
      |> response(200)

      [alert] = Console.Repo.all(Console.Schema.Alert)

      assert alert.service_id == svc.id
      assert_receive {:event, %Console.PubSub.AlertCreated{}}
    end

    test "it can handle payloads with text in body (datadog)", %{conn: conn} do
      hook = insert(:observability_webhook, type: :datadog)
      proj = insert(:project, name: "test-project")
      cluster = insert(:cluster, handle: "test-cluster")
      svc = insert(:service, name: "test-service", cluster: cluster)

      webhook = String.trim(Console.conf(:datadog_webhook_firing_payload)) |> Jason.decode!()

      conn
      |> put_req_header("authorization", Plug.BasicAuth.encode_basic_auth("plrl", hook.secret))
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/observability/datadog/#{hook.external_id}", Jason.encode!(webhook))
      |> response(200)

      [alert] = Console.Repo.all(Console.Schema.Alert)
                |> Enum.map(&Console.Repo.preload(&1, :tags))

      assert alert.service_id == svc.id
      assert alert.cluster_id == cluster.id
      assert alert.project_id == proj.id

      assert_receive {:event, %Console.PubSub.AlertCreated{}}
    end
  end

  test "it can handle payloads with text in body (newrelic)", %{conn: conn} do
    hook = insert(:observability_webhook, type: :newrelic)
    proj = insert(:project, name: "test-project")
    cluster = insert(:cluster, handle: "test-cluster")
    svc = insert(:service, name: "test-service", cluster: cluster)

    webhook = String.trim(Console.conf(:newrelic_webhook_payload)) |> Jason.decode!()

    conn
    |> put_req_header("authorization", Plug.BasicAuth.encode_basic_auth("plrl", hook.secret))
    |> put_req_header("content-type", "application/json")
    |> post("/ext/v1/webhooks/observability/newrelic/#{hook.external_id}", Jason.encode!(webhook))
    |> response(200)

    [alert] = Console.Repo.all(Console.Schema.Alert)
              |> Enum.map(&Console.Repo.preload(&1, :tags))

    assert alert.service_id == svc.id
    assert alert.cluster_id == cluster.id
    assert alert.project_id == proj.id

    assert_receive {:event, %Console.PubSub.AlertCreated{}}
  end

  test "it can handle sentry webhooks", %{conn: conn} do
    hook = insert(:observability_webhook, type: :sentry)
    flow = insert(:flow, name: "test-flow")
    webhook = String.trim(Console.conf(:sentry_webhook_payload))

    signature = :crypto.mac(:hmac, :sha256, hook.secret, webhook)
                  |> Base.encode16(case: :lower)

    conn
    |> put_req_header("sentry-hook-signature", signature)
    |> put_req_header("sentry-hook-resource", "event_alert")
    |> put_req_header("content-type", "application/json")
    |> post("/ext/v1/webhooks/observability/sentry/#{hook.external_id}", webhook)
    |> json_response(200)

    [alert] = Console.Repo.all(Console.Schema.Alert)

    assert alert.flow_id == flow.id
  end

  describe "#issue/2 (Linear)" do
    test "it returns 403 when linear-signature is missing", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :linear)
      payload = Jason.encode!(%{"type" => "Issue", "data" => %{"id" => "linear-123", "title" => "Bug", "url" => "https://linear.app/issue/123", "description" => "Desc", "state" => %{"name" => "Open"}}})

      conn
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/linear/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it returns 403 when linear-signature is invalid", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :linear)
      payload = Jason.encode!(%{"type" => "Issue", "data" => %{"id" => "linear-123", "title" => "Bug", "url" => "https://linear.app/issue/123", "description" => "Desc", "state" => %{"name" => "Open"}}})

      conn
      |> put_req_header("linear-signature", "invalid-signature")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/linear/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it will ignore if payload is invalid (wrong type)", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :linear)
      payload = Jason.encode!(%{"type" => "Comment", "data" => %{}})
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      result =
        conn
        |> put_req_header("linear-signature", signature)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/linear/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["ignored"]
      [] = Console.Repo.all(Console.Schema.Issue)
    end

    test "it will ignore if payload is invalid (missing data)", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :linear)
      payload = Jason.encode!(%{"type" => "Issue"})
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      result =
        conn
        |> put_req_header("linear-signature", signature)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/linear/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["ignored"]
      [] = Console.Repo.all(Console.Schema.Issue)
    end

    test "it can handle a valid Linear issue webhook and creates the issue", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :linear)
      insert(:issue, provider: :linear, external_id: "linear-issue-ext-123")
      linear_issue = %{
        "id" => "linear-issue-ext-123",
        "title" => "Fix login bug",
        "url" => "https://linear.app/team/issue/123",
        "description" => "Users cannot log in on mobile",
        "state" => %{"name" => "In Progress"}
      }
      payload = Jason.encode!(%{"type" => "Issue", "data" => linear_issue})
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      result =
        conn
        |> put_req_header("linear-signature", signature)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/linear/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["message"] == "persisted issue"
      refute result["ignored"]

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.provider == :linear
      assert issue.external_id == "linear-issue-ext-123"
      assert issue.title == "Fix login bug"
      assert issue.url == "https://linear.app/team/issue/123"
      assert issue.body == "Users cannot log in on mobile"
      assert issue.status == :in_progress
    end

    test "it can associate issue with flow when body contains Plural Flow", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :linear)
      flow = insert(:flow, name: "my-flow")
      linear_issue = %{
        "id" => "linear-issue-with-flow",
        "title" => "Task",
        "url" => "https://linear.app/team/issue/456",
        "description" => "Plural Flow: my-flow",
        "state" => %{"name" => "Done"}
      }
      payload = Jason.encode!(%{"type" => "Issue", "data" => linear_issue})
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      conn
      |> put_req_header("linear-signature", signature)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/linear/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.flow_id == flow.id
      assert issue.status == :completed
    end

    test "it upserts issue when external_id already exists", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :linear)
      external_id = "linear-upsert-me"
      insert(:issue, external_id: external_id, provider: :linear, title: "Old title", url: "https://linear.app/old", body: "Old body", status: :open)
      linear_issue = %{
        "id" => external_id,
        "title" => "Updated title",
        "url" => "https://linear.app/team/issue/789",
        "description" => "Updated body",
        "state" => %{"name" => "Done"}
      }
      payload = Jason.encode!(%{"type" => "Issue", "data" => linear_issue})
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      conn
      |> put_req_header("linear-signature", signature)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/linear/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.external_id == external_id
      assert issue.title == "Updated title"
      assert issue.url == "https://linear.app/team/issue/789"
      assert issue.body == "Updated body"
      assert issue.status == :completed
    end
  end

  describe "#issue/2 (Jira)" do
    test "it returns 403 when x-atlassian-webhook-secret is missing", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :jira)
      payload = Jason.encode!(%{"issue" => %{"key" => "PROJ-123", "fields" => %{"summary" => "Bug", "description" => "Desc", "status" => %{"name" => "Open"}}, "self" => "https://mycompany.atlassian.net/rest/api/2/issue/123"}})

      conn
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/jira/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it returns 403 when x-atlassian-webhook-secret is invalid", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :jira)
      payload = Jason.encode!(%{"issue" => %{"key" => "PROJ-123", "fields" => %{"summary" => "Bug", "description" => "Desc", "status" => %{"name" => "Open"}}, "self" => "https://mycompany.atlassian.net/rest/api/2/issue/123"}})

      conn
      |> put_req_header("x-atlassian-webhook-secret", "invalid-secret")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/jira/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it will ignore if payload is invalid (missing issue)", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :jira)
      payload = Jason.encode!(%{"webhookEvent" => "jira:issue_created"})

      result =
        conn
        |> put_req_header("x-atlassian-webhook-secret", hook.secret)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/jira/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["ignored"]
      [] = Console.Repo.all(Console.Schema.Issue)
    end

    test "it can handle a valid Jira issue webhook and creates the issue", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :jira)
      insert(:workbench_webhook, issue_webhook: hook, matches: %{substring: "Fix"})
      jira_payload = %{
        "issue" => %{
          "key" => "PROJ-456",
          "self" => "https://mycompany.atlassian.net/rest/api/2/issue/10001",
          "fields" => %{
            "summary" => "Fix authentication issue",
            "description" => "Users are getting 401 errors",
            "status" => %{"name" => "In Progress"}
          }
        }
      }
      payload = Jason.encode!(jira_payload)

      result =
        conn
        |> put_req_header("x-atlassian-webhook-secret", hook.secret)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/jira/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["message"] == "persisted issue"
      refute result["ignored"]

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.provider == :jira
      assert issue.external_id == "PROJ-456"
      assert issue.title == "Fix authentication issue"
      assert issue.url == "https://mycompany.atlassian.net/browse/PROJ-456"
      assert issue.body == "Users are getting 401 errors"
      assert issue.status == :in_progress
    end

    test "it can handle Jira Cloud ADF description format", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :jira)
      insert(:workbench_webhook, issue_webhook: hook, matches: %{substring: "Issue"})
      jira_payload = %{
        "issue" => %{
          "key" => "PROJ-ADF",
          "self" => "https://mycompany.atlassian.net/rest/api/3/issue/10004",
          "fields" => %{
            "summary" => "Issue with ADF description",
            "description" => %{
              "type" => "doc",
              "version" => 1,
              "content" => [
                %{
                  "type" => "paragraph",
                  "content" => [
                    %{"type" => "text", "text" => "This is the first paragraph."}
                  ]
                },
                %{
                  "type" => "paragraph",
                  "content" => [
                    %{"type" => "text", "text" => "Second paragraph with "},
                    %{"type" => "text", "text" => "bold text", "marks" => [%{"type" => "strong"}]},
                    %{"type" => "text", "text" => "."}
                  ]
                }
              ]
            },
            "status" => %{"name" => "Open"}
          }
        }
      }
      payload = Jason.encode!(jira_payload)

      result =
        conn
        |> put_req_header("x-atlassian-webhook-secret", hook.secret)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/jira/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["message"] == "persisted issue"

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.body == "This is the first paragraph.\nSecond paragraph with bold text."
    end

    test "it can associate issue with flow when body contains Plural Flow", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :jira)
      flow = insert(:flow, name: "jira-flow")
      jira_payload = %{
        "issue" => %{
          "key" => "PROJ-789",
          "self" => "https://mycompany.atlassian.net/rest/api/2/issue/10002",
          "fields" => %{
            "summary" => "Task with flow",
            "description" => "Some work\nPlural Flow: jira-flow",
            "status" => %{"name" => "Done"}
          }
        }
      }
      payload = Jason.encode!(jira_payload)

      conn
      |> put_req_header("x-atlassian-webhook-secret", hook.secret)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/jira/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.flow_id == flow.id
      assert issue.status == :completed
    end

    test "it upserts issue when external_id already exists", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :jira)
      external_id = "PROJ-UPSERT"
      insert(:issue, external_id: external_id, provider: :jira, title: "Old title", url: "https://mycompany.atlassian.net/browse/PROJ-UPSERT", body: "Old body", status: :open)
      jira_payload = %{
        "issue" => %{
          "key" => external_id,
          "self" => "https://mycompany.atlassian.net/rest/api/2/issue/10003",
          "fields" => %{
            "summary" => "Updated Jira title",
            "description" => "Updated Jira body",
            "status" => %{"name" => "Resolved"}
          }
        }
      }
      payload = Jason.encode!(jira_payload)

      conn
      |> put_req_header("x-atlassian-webhook-secret", hook.secret)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/jira/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.external_id == external_id
      assert issue.title == "Updated Jira title"
      assert issue.body == "Updated Jira body"
      assert issue.status == :completed
    end
  end

  describe "#issue/2 (Asana)" do
    test "it returns 403 when x-hook-signature is missing", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :asana)
      payload = Jason.encode!(%{"events" => [%{"action" => "changed", "resource" => %{"gid" => "123", "resource_type" => "task"}}]})

      conn
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/asana/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it returns 403 when x-hook-signature is invalid", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :asana)
      payload = Jason.encode!(%{"events" => [%{"action" => "changed", "resource" => %{"gid" => "123", "resource_type" => "task"}}]})

      conn
      |> put_req_header("x-hook-signature", "invalid-signature")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/asana/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it will ignore if payload is invalid (empty events)", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :asana)
      payload = Jason.encode!(%{"events" => []})
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      result =
        conn
        |> put_req_header("x-hook-signature", signature)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/asana/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["ignored"]
      [] = Console.Repo.all(Console.Schema.Issue)
    end

    @tag :skip
    test "it can handle native Asana events webhook format", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :asana)
      asana_payload = %{
        "events" => [
          %{
            "action" => "changed",
            "resource" => %{"gid" => "1234567890", "resource_type" => "task"},
            "type" => "task"
          }
        ]
      }
      payload = Jason.encode!(asana_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      result =
        conn
        |> put_req_header("x-hook-signature", signature)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/asana/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["message"] == "persisted issue"
      refute result["ignored"]

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.provider == :asana
      assert issue.external_id == "1234567890"
      assert issue.title == "Asana Task 1234567890"
      assert issue.url == "https://app.asana.com/0/0/1234567890"
      assert issue.body == "{webhook event}"
      assert issue.status == :open
    end

    test "it can handle enriched Asana task webhook with full data", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :asana)
      insert(:workbench_webhook, issue_webhook: hook, matches: %{substring: "API integration"})
      asana_payload = %{
        "task" => %{
          "gid" => "asana-task-123",
          "name" => "Complete API integration",
          "notes" => "Integrate with the new payment API",
          "permalink_url" => "https://app.asana.com/0/project/task",
          "completed" => false
        }
      }
      payload = Jason.encode!(asana_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      result =
        conn
        |> put_req_header("x-hook-signature", signature)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/asana/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["message"] == "persisted issue"
      refute result["ignored"]

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.provider == :asana
      assert issue.external_id == "asana-task-123"
      assert issue.title == "Complete API integration"
      assert issue.url == "https://app.asana.com/0/project/task"
      assert issue.body == "Integrate with the new payment API"
      assert issue.status == :open
    end

    test "it marks issue as completed when task is completed", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :asana)
      insert(:issue, provider: :asana, external_id: "asana-completed-task")
      asana_payload = %{
        "task" => %{
          "gid" => "asana-completed-task",
          "name" => "Finished task",
          "notes" => "All done",
          "permalink_url" => "https://app.asana.com/0/project/task2",
          "completed" => true
        }
      }
      payload = Jason.encode!(asana_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hook-signature", signature)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/asana/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.status == :completed
    end

    test "it marks issue as cancelled for deleted events", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :asana)
      insert(:issue, provider: :asana, external_id: "deleted-task-123")
      asana_payload = %{
        "events" => [
          %{
            "action" => "deleted",
            "resource" => %{"gid" => "deleted-task-123", "resource_type" => "task"},
            "type" => "task"
          }
        ]
      }
      payload = Jason.encode!(asana_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hook-signature", signature)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/asana/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.status == :cancelled
    end

    test "it can associate issue with flow when notes contains Plural Flow", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :asana)
      flow = insert(:flow, name: "asana-flow")
      asana_payload = %{
        "task" => %{
          "gid" => "asana-flow-task",
          "name" => "Task with flow",
          "notes" => "Work item\nPlural Flow: asana-flow",
          "permalink_url" => "https://app.asana.com/0/project/task3",
          "completed" => false
        }
      }
      payload = Jason.encode!(asana_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hook-signature", signature)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/asana/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.flow_id == flow.id
    end

    test "it upserts issue when external_id already exists", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :asana)
      external_id = "asana-upsert-me"
      insert(:issue, external_id: external_id, provider: :asana, title: "Old Asana title", url: "https://app.asana.com/old", body: "Old notes", status: :open)
      asana_payload = %{
        "task" => %{
          "gid" => external_id,
          "name" => "Updated Asana title",
          "notes" => "Updated notes",
          "permalink_url" => "https://app.asana.com/0/project/updated",
          "completed" => true
        }
      }
      payload = Jason.encode!(asana_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hook-signature", signature)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/asana/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.external_id == external_id
      assert issue.title == "Updated Asana title"
      assert issue.body == "Updated notes"
      assert issue.status == :completed
    end
  end

  describe "#issue/2 (GitHub)" do
    test "it returns 403 when x-hub-signature-256 is missing", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :github)
      payload = Jason.encode!(%{"issue" => %{"id" => 123, "title" => "Bug", "body" => "Desc", "html_url" => "https://github.com/org/repo/issues/1", "state" => "open"}})

      conn
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/github/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it returns 403 when x-hub-signature-256 is invalid", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :github)
      payload = Jason.encode!(%{"issue" => %{"id" => 123, "title" => "Bug", "body" => "Desc", "html_url" => "https://github.com/org/repo/issues/1", "state" => "open"}})

      conn
      |> put_req_header("x-hub-signature-256", "sha256=invalid-signature")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/github/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it will ignore if payload is invalid (missing issue)", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :github)
      payload = Jason.encode!(%{"action" => "opened"})
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      result =
        conn
        |> put_req_header("x-hub-signature-256", "sha256=#{signature}")
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/github/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["ignored"]
      [] = Console.Repo.all(Console.Schema.Issue)
    end

    test "it can handle a valid GitHub issue webhook and creates the issue", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :github)
      wh = insert(:workbench_webhook, issue_webhook: hook, matches: %{substring: "Application crashes on startup"})
      github_payload = %{
        "action" => "opened",
        "issue" => %{
          "id" => 12345678,
          "title" => "Bug: Application crashes on startup",
          "body" => "Steps to reproduce: 1. Start app 2. See crash",
          "html_url" => "https://github.com/myorg/myrepo/issues/42",
          "state" => "open"
        }
      }
      payload = Jason.encode!(github_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      result =
        conn
        |> put_req_header("x-hub-signature-256", "sha256=#{signature}")
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/github/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["message"] == "persisted issue"
      refute result["ignored"]

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.provider == :github
      assert issue.workbench_id == wh.workbench.id
      assert issue.external_id == "12345678"
      assert issue.title == "Bug: Application crashes on startup"
      assert issue.url == "https://github.com/myorg/myrepo/issues/42"
      assert issue.body == "Steps to reproduce: 1. Start app 2. See crash"
      assert issue.status == :open
    end

    test "it marks issue as completed when closed with completed reason", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :github)
      insert(:issue, provider: :github, external_id: "12345679")
      github_payload = %{
        "action" => "closed",
        "issue" => %{
          "id" => 12345679,
          "title" => "Closed issue",
          "body" => "Fixed now",
          "html_url" => "https://github.com/myorg/myrepo/issues/43",
          "state" => "closed",
          "state_reason" => "completed"
        }
      }
      payload = Jason.encode!(github_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hub-signature-256", "sha256=#{signature}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/github/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.status == :completed
    end

    test "it marks issue as cancelled when closed with not_planned reason", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :github)
      insert(:issue, provider: :github, external_id: "12345680")
      github_payload = %{
        "action" => "closed",
        "issue" => %{
          "id" => 12345680,
          "title" => "Won't fix issue",
          "body" => "Not going to fix this",
          "html_url" => "https://github.com/myorg/myrepo/issues/44",
          "state" => "closed",
          "state_reason" => "not_planned"
        }
      }
      payload = Jason.encode!(github_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hub-signature-256", "sha256=#{signature}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/github/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.status == :cancelled
    end

    test "it can associate issue with flow when body contains Plural Flow", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :github)
      flow = insert(:flow, name: "github-flow")
      github_payload = %{
        "action" => "opened",
        "issue" => %{
          "id" => 12345681,
          "title" => "Issue with flow",
          "body" => "Some work\nPlural Flow: github-flow",
          "html_url" => "https://github.com/myorg/myrepo/issues/45",
          "state" => "open"
        }
      }
      payload = Jason.encode!(github_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hub-signature-256", "sha256=#{signature}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/github/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.flow_id == flow.id
    end

    test "it upserts issue when external_id already exists", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :github)
      external_id = "99999999"
      insert(:issue, external_id: external_id, provider: :github, title: "Old GitHub title", url: "https://github.com/old/issue", body: "Old body", status: :open)
      github_payload = %{
        "action" => "edited",
        "issue" => %{
          "id" => String.to_integer(external_id),
          "title" => "Updated GitHub title",
          "body" => "Updated GitHub body",
          "html_url" => "https://github.com/myorg/myrepo/issues/99",
          "state" => "closed",
          "state_reason" => "completed"
        }
      }
      payload = Jason.encode!(github_payload)
      signature = :crypto.mac(:hmac, :sha256, hook.secret, payload)
                  |> Base.encode16(case: :lower)

      conn
      |> put_req_header("x-hub-signature-256", "sha256=#{signature}")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/github/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.external_id == external_id
      assert issue.title == "Updated GitHub title"
      assert issue.body == "Updated GitHub body"
      assert issue.status == :completed
    end
  end

  describe "#issue/2 (GitLab)" do
    test "it returns 403 when x-gitlab-token is missing", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :gitlab)
      payload = Jason.encode!(%{"object_kind" => "issue", "object_attributes" => %{"iid" => 1, "title" => "Bug", "description" => "Desc", "url" => "https://gitlab.com/group/project/-/issues/1", "state" => "opened"}})

      conn
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/gitlab/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it returns 403 when x-gitlab-token is invalid", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :gitlab)
      payload = Jason.encode!(%{"object_kind" => "issue", "object_attributes" => %{"iid" => 1, "title" => "Bug", "description" => "Desc", "url" => "https://gitlab.com/group/project/-/issues/1", "state" => "opened"}})

      conn
      |> put_req_header("x-gitlab-token", "invalid-token")
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/gitlab/#{hook.external_id}", payload)
      |> response(403)
    end

    test "it will ignore if payload is invalid (wrong object_kind)", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :gitlab)
      payload = Jason.encode!(%{"object_kind" => "merge_request", "object_attributes" => %{}})

      result =
        conn
        |> put_req_header("x-gitlab-token", hook.secret)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/gitlab/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["ignored"]
      [] = Console.Repo.all(Console.Schema.Issue)
    end

    test "it will ignore if payload is invalid (missing object_attributes)", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :gitlab)
      payload = Jason.encode!(%{"object_kind" => "issue"})

      result =
        conn
        |> put_req_header("x-gitlab-token", hook.secret)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/gitlab/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["ignored"]
      [] = Console.Repo.all(Console.Schema.Issue)
    end

    test "it can handle a valid GitLab issue webhook and creates the issue", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :gitlab)
      insert(:workbench_webhook, issue_webhook: hook, matches: %{substring: "Fix CI pipeline failure"})
      gitlab_payload = %{
        "object_kind" => "issue",
        "object_attributes" => %{
          "iid" => 42,
          "title" => "Fix CI pipeline failure",
          "description" => "The pipeline fails on the test stage",
          "url" => "https://gitlab.com/mygroup/myproject/-/issues/42",
          "state" => "opened"
        }
      }
      payload = Jason.encode!(gitlab_payload)

      result =
        conn
        |> put_req_header("x-gitlab-token", hook.secret)
        |> put_req_header("content-type", "application/json")
        |> post("/ext/v1/webhooks/issues/gitlab/#{hook.external_id}", payload)
        |> json_response(200)

      assert result["message"] == "persisted issue"
      refute result["ignored"]

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.provider == :gitlab
      assert issue.external_id == "42"
      assert issue.title == "Fix CI pipeline failure"
      assert issue.url == "https://gitlab.com/mygroup/myproject/-/issues/42"
      assert issue.body == "The pipeline fails on the test stage"
      assert issue.status == :open
    end

    test "it marks issue as completed when state is closed", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :gitlab)
      insert(:issue, provider: :gitlab, external_id: "43")
      gitlab_payload = %{
        "object_kind" => "issue",
        "object_attributes" => %{
          "iid" => 43,
          "title" => "Closed issue",
          "description" => "This was fixed",
          "url" => "https://gitlab.com/mygroup/myproject/-/issues/43",
          "state" => "closed"
        }
      }
      payload = Jason.encode!(gitlab_payload)

      conn
      |> put_req_header("x-gitlab-token", hook.secret)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/gitlab/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.status == :completed
    end

    test "it handles reopened issues", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :gitlab)
      insert(:issue, provider: :gitlab, external_id: "44")
      gitlab_payload = %{
        "object_kind" => "issue",
        "object_attributes" => %{
          "iid" => 44,
          "title" => "Reopened issue",
          "description" => "Still needs work",
          "url" => "https://gitlab.com/mygroup/myproject/-/issues/44",
          "state" => "reopened"
        }
      }
      payload = Jason.encode!(gitlab_payload)

      conn
      |> put_req_header("x-gitlab-token", hook.secret)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/gitlab/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.status == :open
    end

    test "it can associate issue with flow when description contains Plural Flow", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :gitlab)
      flow = insert(:flow, name: "gitlab-flow")
      gitlab_payload = %{
        "object_kind" => "issue",
        "object_attributes" => %{
          "iid" => 45,
          "title" => "Issue with flow",
          "description" => "Some work\nPlural Flow: gitlab-flow",
          "url" => "https://gitlab.com/mygroup/myproject/-/issues/45",
          "state" => "opened"
        }
      }
      payload = Jason.encode!(gitlab_payload)

      conn
      |> put_req_header("x-gitlab-token", hook.secret)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/gitlab/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.flow_id == flow.id
    end

    test "it upserts issue when external_id already exists", %{conn: conn} do
      hook = insert(:issue_webhook, provider: :gitlab)
      external_id = "999"
      insert(:issue, external_id: external_id, provider: :gitlab, title: "Old GitLab title", url: "https://gitlab.com/old/issue", body: "Old body", status: :open)
      gitlab_payload = %{
        "object_kind" => "issue",
        "object_attributes" => %{
          "iid" => 999,
          "title" => "Updated GitLab title",
          "description" => "Updated GitLab body",
          "url" => "https://gitlab.com/mygroup/myproject/-/issues/999",
          "state" => "closed"
        }
      }
      payload = Jason.encode!(gitlab_payload)

      conn
      |> put_req_header("x-gitlab-token", hook.secret)
      |> put_req_header("content-type", "application/json")
      |> post("/ext/v1/webhooks/issues/gitlab/#{hook.external_id}", payload)
      |> response(200)

      [issue] = Console.Repo.all(Console.Schema.Issue)
      assert issue.external_id == external_id
      assert issue.title == "Updated GitLab title"
      assert issue.body == "Updated GitLab body"
      assert issue.status == :completed
    end
  end
end
