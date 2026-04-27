defmodule Console.AI.Workbench.EngineTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Engine, Subagents}
  alias Console.AI.{Provider, Tool}
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
  end
end
