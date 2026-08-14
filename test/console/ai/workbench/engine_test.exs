defmodule Console.AI.Workbench.EngineTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Engine, Subagents}
  alias Console.AI.{Provider, Tool}
  alias Console.PubSub.Consumers.Recurse
  import ElasticsearchUtils

  setup :set_mimic_global

  # the heartbeat GenServer started by Engine.new/1 queries the db in its
  # terminate/2 callback; stop it before the sandbox checks the connection
  # back in so tests don't trip Postgrex disconnection errors between runs.
  setup do
    on_exit(fn ->
      Console.AI.Agents
      |> Registry.select([{{{:workbench_heartbeat, :_}, :"$1", :_}, [], [:"$1"]}])
      |> Enum.each(fn pid ->
        if Process.alive?(pid) do
          try do
            GenServer.stop(pid, :normal, 500)
          catch
            _, _ -> :ok
          end
        end
      end)
    end)

    :ok
  end

  describe "new/1" do
    test "returns an error if the job is not valid" do
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

      # expect(Provider, :completion, fn _, _ ->
      #   {:ok, "Plan complete", [
      #     %Tool{
      #       id: "1",
      #       name: "workbench_plan",
      #       arguments: %{"todos" => [%{name: "todo 1", description: "todo 1", done: false}]}
      #     }
      #   ]}
      # end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "make notes", [
          %Tool{
            id: "2",
            name: "workbench_notes",
            arguments: %{"status" => %{working_theory: "working theory"}, "summary" => "make notes"}
          }
        ]}
      end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "try infrastructure", [
          %Tool{
            id: "3",
            name: "workbench_subagent",
            arguments: %{"prompt" => "try infrastructure", "subagent" => "infrastructure"}
          }
        ]}
      end)

      expect(Provider, :completion, fn _, _ -> {:ok, "need more information"} end)

      expect(Subagents.Infrastructure, :run, fn _, _, _ -> %{status: :successful, result: %{output: "infrastructure result"}} end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "complete", [
          %Tool{
            name: "workbench_complete",
            arguments: %{
              "conclusion" => "complete",
              "todos" => [%{name: "todo 1", description: "todo 1", done: true}],
              "logs" => [
                %{
                  "timestamp" => "2025-02-25T12:00:00Z",
                  "message" => "shutdown complete",
                  "labels" => %{"service" => "worker"}
                }
              ]
            }
          }
        ]}
      end)

      workbench = insert(:workbench, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
      job = insert(:workbench_job, workbench: workbench)

      {:ok, engine} = Engine.new(job)
      {:ok, result} = Engine.run(engine)

      result = Console.Repo.preload(result, :result)
      assert result.status == :successful
      assert result.result.conclusion == "complete"
      assert result.result.metadata
      assert [log] = result.result.metadata.logs
      assert log.message == "shutdown complete"
      assert log.labels == %{"service" => "worker"}

      activities = Console.Repo.all(Console.Schema.WorkbenchJobActivity)
      memo = Enum.find(activities, & &1.type == :memo)
      assert memo.prompt == "make notes"
      assert memo.tool_call.name == "workbench_notes"

      infra = Enum.find(activities, & &1.type == :infrastructure)
      assert infra.prompt == "try infrastructure"
      assert infra.tool_call.name == "workbench_subagent"
    end

    test "runs a skill job with a referenced job without crashing" do
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

      expect(Provider, :completion, fn _, _ ->
        {:ok, "make notes", [
          %Tool{
            id: "2",
            name: "workbench_notes",
            arguments: %{"status" => %{working_theory: "working theory"}, "summary" => "make notes"}
          }
        ]}
      end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "try infrastructure", [
          %Tool{
            id: "3",
            name: "workbench_subagent",
            arguments: %{"prompt" => "try infrastructure", "subagent" => "infrastructure"}
          }
        ]}
      end)

      expect(Provider, :completion, fn _, _ -> {:ok, "need more information"} end)

      expect(Subagents.Infrastructure, :run, fn _, _, _ -> %{status: :successful, result: %{output: "infrastructure result"}} end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "complete", [
          %Tool{
            name: "workbench_complete",
            arguments: %{
              "conclusion" => "complete",
              "todos" => [%{name: "todo 1", description: "todo 1", done: true}]
            }
          }
        ]}
      end)

      workbench = insert(:workbench, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
      referenced_job = insert(:workbench_job, workbench: workbench)
      job = insert(:workbench_job, workbench: workbench, type: :skill, referenced_job: referenced_job)

      {:ok, engine} = Engine.new(job)
      {:ok, result} = Engine.run(engine)

      assert result.status == :successful
      assert result.result.conclusion == "complete"
    end

    test "unlocks verify subagent after a successful action activity" do
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

      expect(Provider, :completion, fn _, _ ->
        {:ok, "call function", [
          %Tool{
            id: "1",
            name: "http_function_call_example_http_function",
            arguments: %{
              "input" => %{},
              "explanation" => "Check that the configured HTTP function is reachable."
            }
          }
        ]}
      end)

      expect(Provider, :completion, fn _, opts ->
        subagent_tool = Enum.find(opts[:plural], &(Tool.name(&1) == "workbench_subagent"))
        subagents = get_in(Tool.json_schema(subagent_tool), ["properties", "subagent", "enum"])

        assert :verify in subagents

        {:ok, "complete", [
          %Tool{
            name: "workbench_complete",
            arguments: %{
              "conclusion" => "complete",
              "todos" => [%{name: "todo 1", description: "todo 1", done: true}]
            }
          }
        ]}
      end)

      project = insert(:project)
      workbench = insert(:workbench, project: project)

      tool =
        insert(:workbench_tool,
          project: project,
          tool: :http,
          categories: [:function],
          name: "example_http_function",
          configuration: %{
            http: %{
              url: "http://127.0.0.1:1",
              method: :get,
              function: true,
              input_schema: %{"type" => "object", "properties" => %{}, "required" => []}
            }
          }
        )

      insert(:workbench_tool_association, workbench: workbench, tool: tool)
      job = insert(:workbench_job, workbench: workbench)

      {:ok, engine} = Engine.new(job)
      {:ok, result} = Engine.run(engine)

      assert result.status == :successful
    end

    test "dispatches build_dashboard tool calls, persists the canvas activity, and completes the job" do
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

      expect(Provider, :completion, fn _, _ ->
        {:ok, "build a dashboard", [
          %Tool{
            id: "1",
            name: "build_dashboard",
            arguments: %{"prompt" => "build a dashboard summarizing /ping 500s"}
          }
        ]}
      end)

      expect(Subagents.Canvas, :run, fn _, _, _ -> "canvas subagent result" end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "complete", [
          %Tool{
            name: "workbench_complete",
            arguments: %{
              "conclusion" => "complete",
              "todos" => [%{name: "todo 1", description: "todo 1", done: true}]
            }
          }
        ]}
      end)

      workbench = insert(:workbench, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
      job = insert(:workbench_job, workbench: workbench)

      {:ok, engine} = Engine.new(job)
      {:ok, result} = Engine.run(engine)

      assert result.status == :successful, "job should terminate when Complete is hit, not hang in :running"

      activities = Console.Repo.all(Console.Schema.WorkbenchJobActivity)
      canvas = Enum.find(activities, & &1.type == :canvas)
      assert canvas, "expected a canvas activity to be created"
      assert canvas.status == :successful, "canvas activity should be marked :successful, not left :pending"
      assert canvas.prompt == "build a dashboard summarizing /ping 500s"
      assert canvas.tool_call.name == "build_dashboard"
      assert canvas.result.output == "canvas subagent result"
    end

    test "safely handles canvas calls when the job.result association hasn't been loaded" do
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

      expect(Provider, :completion, fn _, _ ->
        {:ok, "build a dashboard", [
          %Tool{id: "1", name: "build_dashboard", arguments: %{"prompt" => "go"}}
        ]}
      end)

      expect(Subagents.Canvas, :run, fn _, _, _ -> "ok" end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "complete", [
          %Tool{
            name: "workbench_complete",
            arguments: %{
              "conclusion" => "done",
              "todos" => [%{name: "t", description: "t", done: true}]
            }
          }
        ]}
      end)

      workbench = insert(:workbench, configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}})
      # simulate a raw job handed to Engine.new/1 without :result preloaded —
      # the KeyError regression was triggered by `job.result.canvas` against
      # %Ecto.Association.NotLoaded{}.
      job =
        insert(:workbench_job, workbench: workbench)
        |> Map.put(:result, %Ecto.Association.NotLoaded{
          __field__: :result,
          __owner__: Console.Schema.WorkbenchJob,
          __cardinality__: :one
        })

      {:ok, engine} = Engine.new(job)
      {:ok, result} = Engine.run(engine)

      assert result.status == :successful
    end

    test "creates and polls an exec activity until it is approved" do
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

      cluster = insert(:cluster, handle: "exec-activity-cluster")

      expect(Provider, :completion, fn _, opts ->
        assert Enum.any?(opts[:plural], &(Tool.name(&1) == "exec_k8s_pod"))

        {:ok, "inspect the pod", [
          %Tool{
            id: "exec-1",
            name: "exec_k8s_pod",
            arguments: %{
              "cluster" => cluster.handle,
              "namespace" => "default",
              "pod" => "api-0",
              "container" => "api",
              "command" => "cat /etc/hostname",
              "explanation" => "Inspect the pod hostname."
            }
          }
        ]}
      end)

      expect(Provider, :completion, fn _, _ ->
        {:ok, "complete", [
          %Tool{
            name: "workbench_complete",
            arguments: %{
              "conclusion" => "hostname inspected",
              "todos" => [%{name: "inspect pod", description: "inspect pod", done: true}]
            }
          }
        ]}
      end)

      workbench = insert(:workbench)
      job = insert(:workbench_job, workbench: workbench, modes: %{kubernetes: %{exec: true}})

      {:ok, engine} = Engine.new(job)
      assert engine.job.modes.kubernetes.exec
      approver =
        Task.async(fn ->
          activity = await_job_activity(job.id)
          assert activity.type == :exec
          assert activity.status == :needs_approval
          assert activity.prompt =~ "cat /etc/hostname"
          assert activity.result.kube_exec.handle == cluster.handle
          assert activity.result.kube_exec.pod == "api-0"

          {:ok, activity} =
            Console.Deployments.Workbenches.update_job_activity(
              %{status: :successful, result: %{output: "api-0"}},
              activity
            )

          Recurse.handle_event(%Console.PubSub.WorkbenchJobActivityUpdated{item: activity})
          {:ok, activity}
        end)

      assert {:ok, result} = Engine.run(engine)
      assert {:ok, activity} = Task.await(approver, :timer.seconds(5))
      assert activity.status == :successful
      assert result.status == :successful
      assert result.result.conclusion == "hostname inspected"
    end
  end

  defp await_job_activity(job_id, attempts \\ 80)
  defp await_job_activity(_, 0), do: flunk("timed out waiting for exec activity")
  defp await_job_activity(job_id, attempts) do
    case Console.Repo.get_by(Console.Schema.WorkbenchJobActivity, workbench_job_id: job_id) do
      %Console.Schema.WorkbenchJobActivity{} = activity -> activity
      nil ->
        Process.sleep(50)
        await_job_activity(job_id, attempts - 1)
    end
  end
end
