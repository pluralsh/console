defmodule Console.Deployments.Pr.UtilsTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Pr.Utils

  describe "#render_solid/2" do
    test "it can properly render a solid template w/ context" do
      {:ok, res} = Utils.render_solid("upgraded kubernetes to {{ context.version }}", %{"version" => "1.28"})

      assert res == "upgraded kubernetes to 1.28"
    end
  end
end
