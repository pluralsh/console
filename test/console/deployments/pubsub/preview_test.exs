defmodule Console.Deployments.PubSub.PreviewTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.{PubSub, Repo}
  alias Console.Deployments.PubSub.Preview

  setup do
    {:ok, bot: bot("console")}
  end

  describe "PullRequestCreated" do
    test "it will create a preview instance" do
      flow = insert(:flow)
      pr = insert(:pull_request, status: :open, flow: flow, commit_sha: "pr-123", preview: "test")
      service = insert(:service, namespace: "test", flow: flow)
      template = insert(:preview_environment_template,
        name: "test",
        flow: flow,
        reference_service: service,
        template: build(:service_template,
          namespace: "test-{{ commitSha }}",
          helm: %{values: """
            image:
              tag: {{ commitSha }}
            """
          },
          name: "test-{{ commitSha }}"
        )
      )

      event = %PubSub.PullRequestCreated{item: pr}
      {:ok, inst} = Preview.handle_event(event)

      assert inst.pull_request_id == pr.id
      assert inst.template_id == template.id

      %{service: svc} = Repo.preload(inst, :service)
      assert svc.namespace == "test-pr-123"
      assert svc.name == "test-pr-123"
      assert Jason.decode!(svc.helm.values) == %{"image" => %{"tag" => "pr-123"}}
    end
  end

  describe "PullRequestUpdated" do
    test "it will update a preview instance" do
      flow = insert(:flow)
      pr = insert(:pull_request, status: :closed, flow: flow, commit_sha: "123", preview: "test")
      ref = insert(:service, namespace: "test", flow: flow)
      template = insert(:preview_environment_template,
        name: "test",
        flow: flow,
        reference_service: ref,
        template: build(:service_template,
          namespace: "test-{{ commitSha }}",
          helm: %{values: """
            image:
              tag: {{ commitSha }}
            """
          },
          name: "test-{{ commitSha }}"
        )
      )
      service = insert(:service, namespace: "test-123", name: "test-123", flow: flow)
      insert(:preview_environment_instance,
        pull_request: pr,
        template: template,
        service: service
      )

      event = %PubSub.PullRequestUpdated{item: pr}
      {:ok, service} = Preview.handle_event(event)
      assert refetch(service).deleted_at
    end
  end

  describe "PreviewEnvironmentInstanceCreated" do
    test "it will create a preview instance" do
      insert(:scm_connection, name: "github", type: :github, token: "token", default: true)
      flow = insert(:flow)
      pr = insert(:pull_request,
        status: :open,
        flow: flow,
        commit_sha: "123",
        preview: "test",
        url: "https://github.com/pluralsh/console/pull/123"
      )

      ref = insert(:service, namespace: "test", flow: flow)
      template = insert(:preview_environment_template,
        name: "test",
        flow: flow,
        reference_service: ref,
        template: build(:service_template,
          namespace: "test-{{ commitSha }}",
          helm: %{values: """
            image:
              tag: {{ commitSha }}
            """
          },
          name: "test-{{ commitSha }}"
        )
      )
      service = insert(:service, namespace: "test-123", name: "test-123", flow: flow)
      inst = insert(:preview_environment_instance,
        pull_request: pr,
        template: template,
        service: service
      )
      expect(Tentacat.Pulls.Reviews, :create, fn _, _, _, _, _ -> {:ok, %{"id" => "id"}, :ok} end)

      event = %PubSub.PreviewEnvironmentInstanceCreated{item: inst}
      {:ok, inst} = Preview.handle_event(event)

      assert inst.status.comment_id == "id"
    end
  end

  describe "ServiceUpdated" do
    test "it will update the comment on a service" do
      insert(:scm_connection, name: "github", type: :github, token: "token", default: true)
      flow = insert(:flow)
      pr = insert(:pull_request,
        status: :open,
        flow: flow,
        commit_sha: "123",
        preview: "test",
        url: "https://github.com/pluralsh/console/pull/123"
      )

      ref = insert(:service, namespace: "test", flow: flow)
      template = insert(:preview_environment_template,
        name: "test",
        flow: flow,
        reference_service: ref,
        template: build(:service_template,
          namespace: "test-{{ commitSha }}",
          helm: %{values: """
            image:
              tag: {{ commitSha }}
            """
          },
          name: "test-{{ commitSha }}"
        )
      )
      service = insert(:service, namespace: "test-123", name: "test-123", flow: flow)
      insert(:preview_environment_instance,
        pull_request: pr,
        template: template,
        service: service,
        status: %{comment_id: "id"}
      )
      expect(Tentacat, :put, fn _, _, _ -> {:ok, %{"id" => "id"}, :ok} end)

      event = %PubSub.ServiceUpdated{item: service}
      {:ok, "id"} = Preview.handle_event(event)
    end

    test "it can backfill updates on preview template services" do
      flow = insert(:flow)
      pr = insert(:pull_request, status: :open, flow: flow, commit_sha: "pr-123", preview: "test")
      service = insert(:service, namespace: "test", flow: flow)
      template = insert(:preview_environment_template,
        name: "test",
        flow: flow,
        reference_service: service,
        template: build(:service_template,
          namespace: "test-{{ commitSha }}",
          helm: %{values: """
            image:
              tag: {{ commitSha }}
            """
          },
          name: "test-{{ commitSha }}"
        )
      )
      preview_service = insert(:service, namespace: "test-123", name: "test-123", flow: flow)
      insert(:preview_environment_instance,
        pull_request: pr,
        template: template,
        service: preview_service,
        status: %{comment_id: "id"}
      )

      event = %PubSub.ServiceUpdated{item: service}
      :ok = Preview.handle_event(event)

      %{"image" => %{"tag" => "pr-123"}} = Jason.decode!(refetch(preview_service).helm.values)
    end
  end
end
