defmodule Console.Cached.PodTest do
  use Console.DataCase
  alias Console.Cached.Pod
  import KubernetesScaffolds

  describe "#fetch/0" do
    test "it can properly cache and fetch namespaces" do
      pid = Process.whereis(Pod)

      send pid, %Kazan.Watcher.Event{object: pod("name"), type: :added}
      :timer.sleep(200)
      [%{metadata: %{name: "name"}}] = Pod.fetch()

      send pid, %Kazan.Watcher.Event{object: pod("name"), type: :deleted}
      :timer.sleep(200)
      [] = Pod.fetch()
    end
  end
end
