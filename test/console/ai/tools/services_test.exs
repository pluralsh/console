defmodule Console.AI.Tools.ServicesTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Services

  describe "implement/1" do
    test "it can implement the services tool" do
      user = insert(:user)
      flow = insert(:flow)
      cluster = insert(:cluster, handle: "cluster-handle")
      service = insert(:service, cluster: cluster, flow: flow)

      Console.AI.Tool.context(%{user: user, flow: flow})
      {:ok, tool} = Console.AI.Tool.validate(Services, %{cluster: "cluster-handle"})
      {:ok, content} = Services.implement(tool)

      assert content =~ "cluster-handle"
      assert content =~ service.name
    end
  end
end
