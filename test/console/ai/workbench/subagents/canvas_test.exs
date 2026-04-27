defmodule Console.AI.Workbench.Subagents.CanvasTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.AI.Workbench.{Subagents, Environment, Canvas}
  alias Console.AI.{Provider, Tool}
  import ElasticsearchUtils

  setup :set_mimic_global

  describe "run/3" do
    test "runs block tools, halts on subagent_result, and keeps rendered blocks in process canvas storage" do
      deployment_settings(
        logging: %{enabled: true, driver: :elastic, elastic: es_settings()},
        ai: %{
          enabled: true,
          provider: :openai,
          openai: %{access_token: "key"},
          vector_store: %{
            enabled: true,
            store: :elastic,
            elastic: es_vector_settings()
          }
        }
      )

      expect(Provider, :completion, fn _, _ ->
        {:ok, "building dashboard", [
          %Tool{
            id: "1",
            name: "add_markdown_block",
            arguments: %{
              "identifier" => "summary",
              "markdown" => "## Status\nAll checks passed.",
              "layout" => %{"x" => 0, "y" => 0, "w" => 6, "h" => 2}
            }
          },
          %Tool{
            id: "2",
            name: "add_bar_block",
            arguments: %{
              "identifier" => "latency",
              "layout" => %{"x" => 6, "y" => 0, "w" => 6, "h" => 4},
              "props" => %{
                "title" => "p95 latency (ms)",
                "data" => [
                  %{"label" => "api", "value" => 42.0},
                  %{"label" => "worker", "value" => 120.5}
                ]
              }
            }
          },
          %Tool{
            id: "3",
            name: "add_pie_block",
            arguments: %{
              "identifier" => "traffic",
              "layout" => %{"x" => 0, "y" => 2, "w" => 6, "h" => 4},
              "props" => %{
                "title" => "Traffic share",
                "data" => [
                  %{"label" => "read", "value" => 70.0},
                  %{"label" => "write", "value" => 30.0}
                ]
              }
            }
          },
          %Tool{
            id: "4",
            name: "subagent_result",
            arguments: %{"output" => "Dashboard blocks are ready for review."}
          }
        ]}
      end)

      runtime = insert(:agent_runtime)

      workbench =
        insert(:workbench,
          agent_runtime: runtime,
          configuration: %{infrastructure: %{services: true, stacks: true, kubernetes: true}}
        )

      job =
        insert(:workbench_job, workbench: workbench, user: admin_user())
        |> Repo.preload([:result, :user, workbench: [:agent_runtime]])

      activity =
        insert(:workbench_job_activity,
          workbench_job: job,
          type: :canvas,
          prompt: "Build a compact incident dashboard."
        )

      Console.AI.Tool.context(user: job.user, runtime: workbench.agent_runtime)
      Canvas.new(activity, job.result.canvas || [])

      output = Subagents.Canvas.run(activity, job, Environment.new(job, [], []))

      assert output == "Dashboard blocks are ready for review."

      assert %Canvas{blocks: stored_blocks} = Canvas.canvas()
      assert map_size(stored_blocks) == 3

      rendered = Canvas.canvas() |> Canvas.render()
      assert length(rendered) == 3

      summary = Enum.find(rendered, &(&1.identifier == "summary"))
      bar = Enum.find(rendered, &(&1.identifier == "latency"))
      pie = Enum.find(rendered, &(&1.identifier == "traffic"))

      assert summary.type == :markdown
      assert summary.content.markdown =~ "All checks passed"
      assert bar.type == :bar
      assert bar.content.bar.title == "p95 latency (ms)"
      assert Enum.map(bar.content.bar.data, & &1.label) == ["api", "worker"]
      assert pie.type == :pie
      assert pie.content.pie.title == "Traffic share"
      assert Enum.map(pie.content.pie.data, & &1.label) == ["read", "write"]
    end
  end
end
