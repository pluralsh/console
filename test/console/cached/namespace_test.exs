defmodule Console.Cached.NamespaceTest do
  use Console.DataCase
  alias Console.Cached.Namespace
  import KubernetesScaffolds

  describe "#fetch/0" do
    test "it can properly cache and fetch namespaces" do
      pid = Process.whereis(Namespace)

      send pid, %Kazan.Watcher.Event{object: namespace_scaffold("name"), type: :added}
      :timer.sleep(200)
      [%{metadata: %{name: "name"}}] = Namespace.fetch()

      send pid, %Kazan.Watcher.Event{object: namespace_scaffold("name"), type: :deleted}
      :timer.sleep(200)
      [] = Namespace.fetch()
    end
  end
end
