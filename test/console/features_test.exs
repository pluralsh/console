defmodule Console.FeaturesTest do
  use Console.DataCase, async: false
  alias Console.Plural.Queries
  use Mimic

  setup :set_mimic_global

  describe "available?/1" do
    test "it can fetch features and cache them locally" do
      body = Jason.encode!(%{
        query: Queries.account_query(),
        variables: %{}
      })

      account = %{id: "id", availableFeatures: %{vpn: true}}
      expect(HTTPoison, :post, fn _, ^body, _ ->
        {:ok, %{body: Jason.encode!(%{data: %{account: account}})}}
      end)

      {:ok, pid} = Console.Features.start()

      send pid, :poll

      res = GenServer.call(pid, :fetch)

      assert res.vpn
    end
  end
end
