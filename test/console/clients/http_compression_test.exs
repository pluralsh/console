defmodule Console.Clients.HttpCompressionTest do
  use ExUnit.Case, async: false
  use Mimic

  alias Console.Schema.DeploymentSettings.Connection

  setup :set_mimic_global

  test "Prometheus client enables compressed responses" do
    expect(Req, :post, fn _url, opts ->
      assert opts[:compressed]

      {:ok,
       %Req.Response{
         status: 200,
         body: Poison.encode!(%{status: "success", data: %{resultType: "vector", result: []}})
       }}
    end)

    assert {:ok, %Prometheus.Response{}} =
             Prometheus.Client.query(%Connection{host: "http://prometheus"}, "up", %{})
  end

  test "Loki client enables compressed responses" do
    expect(Req, :get, fn _url, opts ->
      assert opts[:compressed]

      {:ok,
       %Req.Response{
         status: 200,
         body: Poison.encode!(%{status: "success", data: %{resultType: "streams", result: []}})
       }}
    end)

    assert {:ok, %Loki.Response{}} =
             Loki.Client.query(%Connection{host: "http://loki"}, "{app=\"console\"}", 1, 2, 100)
  end
end
