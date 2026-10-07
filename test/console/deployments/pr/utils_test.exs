defmodule Console.Deployments.Pr.UtilsTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Pr.Utils

  describe "#render_solid/2" do
    test "it can properly render a solid template w/ context" do
      {:ok, res} = Utils.render_solid("upgraded kubernetes to {{ context.version }}", %{"version" => "1.28"})

      assert res == "upgraded kubernetes to 1.28"
    end
  end

  describe "#pr_associations/2" do
    test "ignores markers inside inline HTML comments" do
      assert %{preview: nil} = Utils.pr_associations("<!-- Plural Preview: docs -->")
    end

    test "ignores markers inside multiline HTML comments" do
      content = """
      <!-- To enable a preview, uncomment the following line.
      Plural Preview: docs
      -->
      """

      assert %{preview: nil} = Utils.pr_associations(content)
    end

    test "continues to parse uncommented markers" do
      assert %{preview: "docs"} = Utils.pr_associations("Plural Preview: docs")
    end
  end
end
