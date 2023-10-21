defmodule ConsoleWeb.ClusterChannelTest do
  use ConsoleWeb.ChannelCase, async: false

  describe "ClusterChannel" do
    test "it can broadcast cluster events" do
      cluster = insert(:cluster)

      {:ok, socket} = cluster_socket(cluster)

      {:ok, _, socket} = subscribe_and_join(socket, "cluster:#{cluster.id}", %{})
      broadcast_from!(socket, "service.event", %{"id" => "some-id"})
      assert_push "service.event", %{"id" => "some-id"}
    end
  end
end
