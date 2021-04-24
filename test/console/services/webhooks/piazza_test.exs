defmodule Console.Webhooks.Formatter.PiazzaTest do
  use Console.DataCase, async: true
  alias Console.Webhooks.Formatter.Piazza

  describe "format/1" do
    test "It can format successful builds" do
      build = insert(:build, status: :successful)

      {:ok, %{text: text, structured_message: message}} = Piazza.format(build)

      assert text =~ build.repository
      assert message =~ build.id
      assert message =~ "#007a5a"
    end

    test "It can format unsuccessful builds" do
      build = insert(:build, status: :failed)

      {:ok, %{text: text, structured_message: message}} = Piazza.format(build)

      assert text =~ build.repository
      assert message =~ build.id
      assert message =~ "#CC4400"
    end
  end
end
