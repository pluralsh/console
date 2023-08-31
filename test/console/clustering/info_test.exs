defmodule Console.Clustering.InfoTest do
  use Console.DataCase, async: true
  use Mimic
  import KubernetesScaffolds

  alias Console.Clustering.Info

  describe "#fetch/0" do
    test "it can compile summary information for this cluster" do
      expect(Kazan, :run, fn _ -> {:ok, %{items: [kube_node(), kube_node()]}} end)

      {:ok, summary} = Info.fetch()

      assert summary.cpu == 4000
      assert summary.memory == 12 * 1024 * 1024 * 1024
    end
  end
end
