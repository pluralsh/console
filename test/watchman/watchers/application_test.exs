defmodule Watchman.Watchers.ApplicationTest do
  use Watchman.DataCase, async: false
  alias Watchman.Watchers.Application
  use Mimic

  setup :set_mimic_global

  describe "applications" do
    test "it will watch the applications endpoint" do
      me = self()
      expect(Kazan.Watcher, :start_link, fn _, [send_to: _] ->
        send me, :start_link
        {:ok, me}
      end)

      {:ok, _} = Application.start_link()

      assert_receive :start_link
    end
  end
end