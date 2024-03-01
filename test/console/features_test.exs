defmodule Console.FeaturesTest do
  use Console.DataCase, async: false
  alias Console.Plural.Queries
  alias Console.Features
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

      {:ok, pid} = Features.start()

      send pid, :poll

      res = GenServer.call(pid, :fetch)

      assert res.vpn
    end
  end

  describe "#check_license?/0" do
    test "if a license key is provided, it will verify" do
      if System.get_env("CONSOLE_LICENSE") do
        key = System.get_env("CONSOLE_LICENSE")
        {features, account} = Features.check_license(key)

        assert features.cd
        assert account.subscription.plan.name == "Enterprise"
      end
    end
  end
end
