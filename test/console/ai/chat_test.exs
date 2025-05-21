defmodule Console.AI.ChatTest do
  use Console.DataCase, async: true
  alias Console.AI.Chat
  alias Console.Repo
  use Mimic

  describe "#create_thread/2" do
    test "users can create new chat threads" do
      user = insert(:user)

      {:ok, thread} = Chat.create_thread(%{summary: "a thread"}, user)

      assert thread.summary == "a thread"
      refute thread.default
      assert thread.user_id == user.id
    end

    test "flow readers can create flow threads" do
      user = insert(:user)
      flow = insert(:flow, read_bindings: [%{user_id: user.id}])

      {:ok, thread} = Chat.create_thread(%{summary: "a thread", flow_id: flow.id}, user)

      assert thread.summary == "a thread"
      assert thread.flow_id == flow.id
    end

    test "non-flow readers cannot create flow threads" do
      user = insert(:user)
      flow = insert(:flow)

      {:error, _} = Chat.create_thread(%{summary: "a thread", flow_id: flow.id}, user)
    end
  end

  describe "#update_thread/2" do
    test "users can update their thread" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)

      {:ok, update} = Chat.update_thread(%{summary: "update"}, thread.id, user)

      assert update.id == thread.id
      assert update.summary == "update"
    end

    test "users cannot update other users threads" do
      user = insert(:user)
      thread = insert(:chat_thread)

      {:error, _} = Chat.update_thread(%{summary: "udpate"}, thread.id, user)
    end
  end

  describe "#delete_thread/2" do
    test "users can delete their thread" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)

      {:ok, delete} = Chat.delete_thread(thread.id, user)

      assert delete.id == thread.id
      refute refetch(delete)
    end

    test "users cannot delete other users threads" do
      user = insert(:user)
      thread = insert(:chat_thread)

      {:error, _} = Chat.delete_thread(thread.id, user)
    end
  end

  describe "#rollup/1" do
    test "it can summarize the expired messages in a user chat" do
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})

      user = insert(:user)
      thread = insert(:chat_thread, user: user)
      old = insert_list(3, :chat, thread: thread, user: user, inserted_at: Timex.now() |> Timex.shift(days: -7))
      keep = insert_list(3, :chat, thread: thread, user: user)
      old_other = insert_list(3, :chat, inserted_at: Timex.now() |> Timex.shift(days: -7))
      old_other2 = insert_list(3, :chat, user: user, inserted_at: Timex.now() |> Timex.shift(days: -7))

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _, _], _ -> {:ok, "openai completion"} end)

      {:ok, summary} = Chat.rollup(thread)

      assert summary.user_id == user.id
      assert summary.content == "openai completion"
      assert summary.seq == -1
      assert summary.thread_id == thread.id

      for c <- old,
        do: refute refetch(c)

      for c <- keep ++ old_other ++ old_other2,
        do: assert refetch(c)
    end
  end

  describe "#summarize/1" do
    test "it can summarize the contents of a thread" do
      thread = insert(:chat_thread)
      insert_list(3, :chat, thread: thread)
      insert_list(3, :chat)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _, _], _ -> {:ok, "ai thread summary"} end)

      {:ok, summarized} = Chat.summarize(thread)

      assert summarized.id == thread.id
      assert summarized.summary == "ai thread summary"
      assert summarized.summarized
    end
  end

  describe "#save/2" do
    test "it will save a list of messages for a given user" do
      user = insert(:user)

      {:ok, [first, second]} = Chat.save([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], user)

      assert first.content == "blah"
      assert first.user_id == user.id
      assert first.role == :assistant

      assert second.content == "blah blah"
      assert second.user_id == user.id
      assert second.role == :user

      assert first.seq < second.seq
    end

    test "it will save a list of messages for a given user in a thread" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)

      {:ok, [first, second]} = Chat.save([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert first.content == "blah"
      assert first.user_id == user.id
      assert first.role == :assistant

      assert second.content == "blah blah"
      assert second.user_id == user.id
      assert second.role == :user

      assert first.seq < second.seq

      assert Enum.all?([first, second], & &1.thread_id == thread.id)
    end

    test "you cannot save messages in another users thread" do
      user = insert(:user)
      thread = insert(:chat_thread)

      {:error, _} = Chat.save([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)
    end
  end

  describe "#chat/2" do
    test "it will persist a set of messages and generate a new one transactionally in whatever thread" do
      user = insert(:user)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
      expect(Console.AI.OpenAI, :completion, 2, fn _, [_, _, _], _ -> {:ok, "openai completion"} end)

      {:ok, next} = Chat.chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], user)

      assert next.user_id == user.id
      assert next.role == :assistant
      assert next.content == "openai completion"

      thread = insert(:chat_thread, user: user)

      {:ok, next} = Chat.chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.thread_id == thread.id
      assert next.user_id == user.id
      assert next.role == :assistant
      assert next.content == "openai completion"

      assert refetch(thread).last_message_at
    end

    test "it will persist a set of messages and generate a new one transactionally in a thread" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _], _ -> {:ok, "openai completion"} end)

      {:ok, next} = Chat.chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.user_id == user.id
      assert next.thread_id == thread.id
      assert next.role == :assistant
      assert next.content == "openai completion"
    end

    test "you cannot chat in another users thread" do
      user = insert(:user)
      thread = insert(:chat_thread)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})

      {:error, _} = Chat.chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)
    end
  end

  describe "#make_default_thread/1" do
    test "only one default thread can be created" do
      user = insert(:user)

      thread = Chat.make_default_thread!(user)

      assert thread.user_id == user.id
      assert thread.default

      {:error, _} = Chat.create_thread(%{default: true, summary: "blah"}, user)
    end
  end

  describe "#create_pin/2" do
    test "a user can pin an insight" do
      user = insert(:user)
      insight = insert(:ai_insight)

      {:ok, pin} = Chat.create_pin(%{insight_id: insight.id}, user)

      assert pin.user_id == user.id
      assert pin.insight_id == insight.id
    end
  end

  describe "#delete_pin/2" do
    test "a user can delete their pin" do
      user = insert(:user)
      pin = insert(:ai_pin, user: user)

      {:ok, del} = Chat.delete_pin(pin.id, user)

      assert del.id == pin.id
      refute refetch(pin)
    end

    test "users cannot delete others' pins" do
      {:error, _} = Chat.delete_pin(insert(:ai_pin).id, insert(:user))
    end
  end

  describe "#pr/2" do
    test "it can spawn a pr from a thread" do
      insert(:scm_connection, token: "some-pat", default: true)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})
      expect(Tentacat.Pulls, :create, fn _, "pluralsh", "console", %{head: "plrl/ai/pr-test" <> _} ->
        {:ok, %{"html_url" => "https://github.com/pr/url"}, %HTTPoison.Response{}}
      end)
      expect(Console.Deployments.Pr.Git, :setup, fn conn, "https://github.com/pluralsh/console.git", "plrl/ai/pr-test" <> _ ->
        {:ok, %{conn | dir: Briefly.create!(directory: true)}}
      end)
      expect(Console.Deployments.Pr.Git, :commit, fn _, _ -> {:ok, ""} end)
      expect(Console.Deployments.Pr.Git, :push, fn _, "plrl/ai/pr-test" <> _ -> {:ok, ""} end)
      expect(File, :write, fn _, "first" -> :ok end)
      expect(File, :write, fn _, "second" -> :ok end)
      expect(HTTPoison, :post, fn _, _, _, _ ->
        {:ok, %HTTPoison.Response{status_code: 200, body: Jason.encode!(%{choices: [
            %{
              message: %{
                tool_calls: [%{
                  function: %{
                    name: "create_pr",
                    arguments: Jason.encode!(%{
                      repo_url: "git@github.com:pluralsh/console.git",
                      branch_name: "pr-test",
                      pr_description: "some pr",
                      pr_title: "some pr",
                      commit_message: "a commit",
                      file_updates: [
                        %{
                          file_name: "file.yaml",
                          replacement: "first",
                          previous: "second"
                        },
                        %{
                          file_name: "file2.yaml",
                          replacement: "second",
                          previous: "first"
                        }
                      ]
                    })
                  }
              }]
            }
          }
        ]})}}
      end)

      user = insert(:user)
      thread = insert(:chat_thread, user: user)
      insert_list(3, :chat, thread: thread)

      {:ok, chat} = Chat.pr(thread.id, user)

      assert chat.thread_id == thread.id

      %{pull_request: pr} = Repo.preload(chat, [:pull_request])

      assert pr.url == "https://github.com/pr/url"
    end
  end

  describe "cancel_chat/2" do
    test "cancels a chat message" do
      user   = insert(:user)
      thread = insert(:chat_thread, user: user)
      chat   = insert(:chat, thread: thread, user: user, confirm: true)

      {:ok, chat} = Chat.cancel_chat(chat, user)

      refute refetch(chat)
    end
  end

  describe "#clone_thread/2" do
    test "it can clone a thread" do
      user = insert(:user)
      thread = insert(:chat_thread, user: user, flow: insert(:flow))
      for i <- 1..3, do: insert(:chat, content: "msg #{i}", seq: i, thread: thread, user: user)
      {:ok, clone} = Chat.clone_thread(4, thread.id, user)

      assert clone.id != thread.id
      assert clone.summary == "Clone of #{thread.summary}"
      assert clone.user_id == user.id
      assert clone.flow_id == thread.flow_id

      chats = Console.Schema.Chat.for_thread(clone.id)
              |> Console.Schema.Chat.ordered()
              |> Repo.all()

      assert length(chats) == 3
      for {c, i} <- Enum.with_index(chats) do
        assert c.user_id == user.id
        assert c.thread_id == clone.id
        assert c.content == "msg #{i + 1}"
        assert c.seq == i
      end
    end
  end
end

defmodule Console.AI.ChatSyncTest do
  use Console.DataCase, async: false
  import ElasticsearchUtils
  alias Console.Repo
  alias Console.AI.{Chat, Tool}
  alias Console.Schema.{McpServerAudit}
  use Mimic

  describe "#add_context/2" do
    test "adds a set of context messages to a thread from a source" do
      user = insert(:user)
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      parent = insert(:service,
        repository: git,
        git: %{ref: "main", folder: "charts/deployment-operator"}
      )

      svc = insert(:service,
        repository: git,
        git: %{ref: "main", folder: "charts/deployment-operator"},
        write_bindings: [%{user_id: user.id}],
        parent: parent
      )

      thread = insert(:chat_thread, user: user)

      {:ok, [_ | _] = msgs} = Chat.add_context(:service, svc.id, thread.id, user)

      assert Enum.any?(msgs, & &1.type == :file)
    end

    test "you can't add context if you don't have access" do
      user = insert(:user)
      git = insert(:git_repository, url: "https://github.com/pluralsh/deployment-operator.git")
      svc = insert(:service,
        repository: git,
        git: %{ref: "main", folder: "charts/deployment-operator"}
      )
      thread = insert(:chat_thread, user: user)

      {:error, _} = Chat.add_context(:service, svc.id, thread.id, user)
    end
  end

  describe "#hybrid_chat/3" do
    test "it can chat with a tool call" do
      user   = insert(:user)
      flow   = insert(:flow)
      thread = insert(:chat_thread, user: user, flow: flow)
      server = insert(:mcp_server, url: "http://localhost:3001", name: "everything")
      insert(:mcp_server_association, server: server, flow: flow)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})

      toolname = Console.AI.MCP.Agent.tool_name("everything", "echo")
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _], _ ->
        {:ok, "openai toolcall", [%Tool{name: toolname, arguments: %{"message" => "a message"}}]}
      end)

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _, _], _ ->
        {:ok, "openai completion"}
      end)

      {:ok, [next, tool, finish]} = Chat.hybrid_chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.user_id == user.id
      assert next.thread_id == thread.id
      assert next.role == :assistant
      assert next.content == "openai toolcall"
      assert tool.content == "Echo: a message"
      assert tool.type == :tool
      assert tool.server_id == server.id
      assert tool.attributes.tool.arguments
      assert finish.content == "openai completion"

      [audit] = Repo.all(McpServerAudit)

      assert audit.server_id == server.id
      assert audit.actor_id == user.id
      assert audit.tool == "echo"
    end

    test "it won't recurse if a mcp call requires confirmation" do
      user   = insert(:user)
      flow   = insert(:flow)
      thread = insert(:chat_thread, user: user, flow: flow)
      server = insert(:mcp_server, confirm: true, url: "http://localhost:3001", name: "everything")
      insert(:mcp_server_association, server: server, flow: flow)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})

      toolname = Console.AI.MCP.Agent.tool_name("everything", "echo")
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _], _ ->
        {:ok, "openai toolcall", [%Tool{name: toolname, arguments: %{"message" => "a message"}}]}
      end)

      {:ok, [next, tool]} = Chat.hybrid_chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.user_id == user.id
      assert next.thread_id == thread.id
      assert next.role == :assistant
      assert next.content == "openai toolcall"
      refute tool.content
      assert tool.server_id == server.id
      assert tool.attributes.tool.name == "echo"
      assert tool.attributes.tool.arguments == %{"message" => "a message"}

      [] = Repo.all(McpServerAudit)
    end

    test "it can chat with a plural tool call" do
      user   = insert(:user)
      flow   = insert(:flow)
      service = insert(:service, flow: flow)
      thread = insert(:chat_thread, user: user, flow: flow)
      server = insert(:mcp_server, url: "http://localhost:3001", name: "everything")
      insert(:mcp_server_association, server: server, flow: flow)
      deployment_settings(ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}})

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _], _ ->
        {:ok, "openai toolcall", [%Tool{name: "__plrl__clusters", arguments: %{}}]}
      end)

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _, _], _ ->
        {:ok, "openai completion"}
      end)

      {:ok, [next, tool | _]} = Chat.hybrid_chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.user_id == user.id
      assert next.thread_id == thread.id
      assert next.role == :assistant
      assert next.content == "openai toolcall"
      assert tool.content =~ service.cluster.handle
      assert tool.attributes.tool.name == "__plrl__clusters"
    end

    test "it can chat with a plural logs tool call" do
      user    = insert(:user)
      flow    = insert(:flow)
      service = insert(:service, flow: flow)
      thread  = insert(:chat_thread, user: user, flow: flow)
      server  = insert(:mcp_server, url: "http://localhost:3001", name: "everything")
      insert(:mcp_server_association, server: server, flow: flow)
      deployment_settings(
        logging: %{
          enabled: true,
          driver: :elastic,
          elastic: es_settings(),
        },
        ai: %{enabled: true, provider: :openai, openai: %{access_token: "key"}}
      )

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _], _ ->
        {:ok, "openai toolcall", [%Tool{name: "__plrl__logs", arguments: %{
          "service_deployment" => service.name,
          "cluster" => service.cluster.handle,
          "query" => "error"
        }}]}
      end)

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _, _], _ ->
        {:ok, "openai completion"}
      end)

      log_document(service, "error what is happening") |> index_doc()
      log_document(service, "another valid log message") |> index_doc()
      refresh()

      {:ok, [next, tool | _]} = Chat.hybrid_chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.user_id == user.id
      assert next.thread_id == thread.id
      assert next.role == :assistant
      assert next.content == "openai toolcall"
      assert tool.content =~ "what is happening"
      assert tool.attributes.tool.name == "__plrl__logs"
    end

    test "it can chat with a prs tool call" do
      user = insert(:user)
      %{id: flow_id} = flow = insert(:flow)
      thread = insert(:chat_thread, user: user, flow: flow)
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: es_vector_settings(),
          },
        }
      )

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _], _ ->
        {:ok, "openai toolcall", [%Tool{name: "__plrl__pull_requests", arguments: %{"query" => "error"}}]}
      end)
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _, _], _ ->
        {:ok, "openai completion"}
      end)

      expect(Console.AI.VectorStore, :fetch, fn "error", [filters: [flow_id: ^flow_id, datatype: {:raw, :pr_file}]] ->
        {:ok, [
          %Console.AI.VectorStore.Response{
            type: :pr,
            pr_file: %Console.Deployments.Pr.File{
              url: "https://github.com/pr/url",
              repo: "some/repo",
              title: "a pr",
              sha: "asdfsa",
              contents: "file contents",
              filename: "example.js",
              patch: "some patch"
            }
          }
        ]}
      end)

      {:ok, [next, tool | _]} = Chat.hybrid_chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.user_id == user.id
      assert next.thread_id == thread.id
      assert next.role == :assistant
      assert next.content == "openai toolcall"
      assert tool.role == :user
      assert tool.content =~ "some patch"
      assert tool.attributes.tool.name == "__plrl__pull_requests"
      assert tool.attributes.tool.arguments == %{"query" => "error"}
    end

    test "it can chat with a plural alerts tool call" do
      user = insert(:user)
      flow = insert(:flow)
      service = insert(:service, flow: flow)
      thread = insert(:chat_thread, user: user, flow: flow)
      insert(:alert,
        service: service,
        title: "PagerDuty-Low-Severity-Firing",
        message: "low severity pagerduty alert",
        type: :pagerduty,
        severity: :low,
        state: :firing
      )
      insert(:alert,
        service: service,
        title: "PagerDuty-Critical-Severity-Firing",
        message: "critical severity pagerduty alert",
        type: :pagerduty,
        severity: :critical,
        state: :firing
      )
      insert(:alert,
        service: service,
        title: "PagerDuty-Critical-Severity-Resolved",
        message: "critical severity pagerduty alert resolved",
        type: :pagerduty,
        severity: :critical,
        state: :resolved
      )
      insert(:alert,
        service: service,
        title: "Grafana-Critical-Severity-Firing",
        message: "critical severity grafana alert",
        type: :grafana,
        severity: :critical,
        state: :firing
      )

      deployment_settings(ai: %{
        enabled: true,
        provider: :openai,
        openai: %{access_token: "key"}
      })

      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _], _ ->
        {:ok, "openai toolcall", [%Tool{name: "__plrl__alerts", arguments: %{"severities" => ["critical"], "types" => ["pagerduty"], "state" => "firing"}}]}
      end)
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _, _], _ ->
        {:ok, "openai completion"}
      end)

      {:ok, [next, tool | _]} = Chat.hybrid_chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.user_id == user.id
      assert next.thread_id == thread.id
      assert next.role == :assistant
      assert next.content == "openai toolcall"

      assert tool.role == :user
      assert tool.content =~ "PagerDuty-Critical-Severity-Firing"
      refute tool.content =~ "PagerDuty-Critical-Severity-Resolved"
      refute tool.content =~ "PagerDuty-Low-Severity-Firing"
      refute tool.content =~ "Grafana-Critical-Severity-Firing"
      assert tool.attributes.tool.name == "__plrl__alerts"
      assert tool.attributes.tool.arguments == %{"severities" => ["critical"], "types" => ["pagerduty"], "state" => "firing"}
    end

    test "it can call a plural alerts tool call" do
      user = insert(:user)
      flow = insert(:flow)
      thread = insert(:chat_thread, user: user, flow: flow)
      service = insert(:service, flow: flow)
      alert = insert(:alert,
        service: service,
        title: "PagerDuty-Critical-Severity-Resolved",
        message: "critical severity pagerduty alert resolved",
        type: :pagerduty,
        severity: :critical
      )
      alert_resolution = insert(:alert_resolution,
        alert: alert,
        resolution: "Resolution details for the alert."
      )
      deployment_settings(ai:
        %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: ElasticsearchUtils.es_vector_settings(),
          },
        }
      )
      ElasticsearchUtils.drop_index(ElasticsearchUtils.vector_index())

      # Mock embeddings for 2 calls, once for alert resolution and once for query
      expect(Console.AI.OpenAI, :embeddings, 2, fn _, text ->
        {:ok, [{text, ElasticsearchUtils.vector()}]}
      end)
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _], _ ->
        {:ok, "openai toolcall", [%Tool{name: "__plrl__alerts_resolutions", arguments: %{"query" => "query"}}]}
      end)
      expect(Console.AI.OpenAI, :completion, fn _, [_, _, _, _, _], _ ->
        {:ok, "openai completion"}
      end)

      reloaded_resolution = Repo.preload(alert_resolution, [alert: :service])
      mini_alert_resolution = Console.Schema.AlertResolution.Mini.new(reloaded_resolution)

      Console.AI.VectorStore.insert(mini_alert_resolution, filters: [flow_id: flow.id])
      ElasticsearchUtils.refresh(ElasticsearchUtils.vector_index())

      {:ok, [next, tool | _]} = Chat.hybrid_chat([
        %{role: :assistant, content: "blah"},
        %{role: :user, content: "blah blah"}
      ], thread.id, user)

      assert next.user_id == user.id
      assert next.thread_id == thread.id
      assert next.role == :assistant
      assert next.content == "openai toolcall"

      assert tool.content =~ "PagerDuty-Critical-Severity-Resolved"
      assert tool.content =~ "Resolution details for the alert."
      assert tool.attributes.tool.name == "__plrl__alerts_resolutions"
      assert tool.attributes.tool.arguments == %{"query" => "query"}
    end
  end

  describe "confirm_chat/2" do
    test "it can confirm a chat message and call its MCP server" do
      user   = insert(:user)
      server = insert(:mcp_server, url: "http://localhost:3001", name: "everything")
      flow   = insert(:flow)
      insert(:mcp_server_association, server: server, flow: flow)

      chat = insert(:chat,
        user: user,
        thread: insert(:chat_thread, user: user, flow: flow),
        confirm: true,
        attributes: %{tool: %{name: "echo", arguments: %{"message" => "a message"}}},
        server: server
      )

      {:ok, chat} = Chat.confirm_chat(chat.id, user)

      assert chat.content =~ "Echo: a message"
      assert chat.confirmed_at
      assert chat.attributes.tool.name == "echo"
      assert chat.attributes.tool.arguments == %{"message" => "a message"}

      [audit] = Repo.all(McpServerAudit)

      assert audit.server_id == server.id
      assert audit.actor_id == user.id
      assert audit.tool == "echo"
    end

    test "non thread members cannot confirm" do
      user   = insert(:user)
      server = insert(:mcp_server, url: "http://localhost:3001", name: "everything")
      flow   = insert(:flow)
      insert(:mcp_server_association, server: server, flow: flow)

      chat = insert(:chat,
        thread: insert(:chat_thread, user: user, flow: flow),
        confirm: true,
        attributes: %{tool: %{name: "echo", arguments: %{"message" => "a message"}}},
        server: server
      )

      {:error, _} = Chat.confirm_chat(chat.id, insert(:user))
    end
  end
end
