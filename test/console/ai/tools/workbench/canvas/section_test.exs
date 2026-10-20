defmodule Console.AI.Tools.Workbench.Canvas.SectionBlockTest do
  use Console.DataCase, async: true

  alias Console.AI.Tool
  alias Console.AI.Workbench.Canvas
  alias Console.AI.Tools.Workbench.Canvas.{MarkdownBlock, SectionBlock}

  setup do
    Canvas.new(insert(:workbench_job_activity), [])
    :ok
  end

  describe "implement/1" do
    test "adds a section that blocks can join" do
      {:ok, section} = Tool.validate(SectionBlock, %{
        "identifier" => "errors",
        "title" => "Errors",
        "description" => "Where the 500s come from",
        "position" => 1,
        "collapsed" => true
      })
      assert {:ok, _} = Tool.implement(SectionBlock, section)

      {:ok, markdown} = Tool.validate(MarkdownBlock, %{
        "identifier" => "notes",
        "markdown" => "# Notes",
        "section_id" => "errors",
        "description" => "Context for the errors",
        "layout" => %{"x" => 0, "y" => 0, "w" => 3, "h" => 1}
      })
      assert {:ok, _} = Tool.implement(MarkdownBlock, markdown)

      blocks = Map.new(Canvas.render(Canvas.canvas()), &{&1.identifier, &1})

      assert %{type: :section, title: "Errors", collapsed: true, layout: %{y: 1}} = blocks["errors"]
      assert %{section_id: "errors", description: "Context for the errors"} = blocks["notes"]
    end

    test "rejects blocks added before their section" do
      {:ok, markdown} = Tool.validate(MarkdownBlock, %{
        "identifier" => "notes",
        "markdown" => "# Notes",
        "section_id" => "errors",
        "layout" => %{"x" => 0, "y" => 0, "w" => 3, "h" => 1}
      })

      assert {:error, message} = Tool.implement(MarkdownBlock, markdown)
      assert message =~ "unknown section errors"
    end
  end
end
