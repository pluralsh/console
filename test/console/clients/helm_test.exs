defmodule Console.Helm.ClientTest do
  use ExUnit.Case, async: false
  use Mimic
  alias Console.Helm.{Client, Index, Chart, Utils}
  alias Console.Schema.HelmRepository

  setup :set_mimic_global

  @index """
  apiVersion: v1
  entries:
    app:
      - {name: app, version: 1.2.0, urls: [https://charts.example.com/app-1.2.0.tgz], digest: a}
      - {name: app, version: latest, urls: [https://charts.example.com/app-latest.tgz], digest: b}
      - {name: app, version: 1.10.0, urls: [https://charts.example.com/app-1.10.0.tgz], digest: c}
      - {name: app, version: v1.9.1, urls: [https://charts.example.com/app-1.9.1.tgz], digest: d}
  """

  describe "Utils.sort_versions/1" do
    test "it orders semver newest first and keeps tags last" do
      charts = Enum.map(~w(1.2.0 latest 1.10.0 v1.9.1 1.10.0-rc.1), &%Chart{version: &1})

      assert Enum.map(Utils.sort_versions(charts), & &1.version) ==
        ~w(1.10.0 1.10.0-rc.1 v1.9.1 1.2.0 latest)
    end
  end

  describe "#index/2" do
    test "it presorts versions and resolves wildcards against them" do
      expect(Req, :get, fn _, _ -> {:ok, %Req.Response{status: 200, body: @index}} end)

      {:ok, %Index{} = idx} = Client.index(client())
      assert Enum.map(idx.sorted["app"], & &1.version) == ~w(1.10.0 v1.9.1 1.2.0 latest)

      {:ok, _, url, "c"} = Client.chart(client(), idx, "app", "1.x.x")
      assert url == "https://charts.example.com/app-1.10.0.tgz"
    end

    test "it reuses the previous index when the repository reports it unchanged" do
      expect(Req, :get, fn _, _ ->
        {:ok, %Req.Response{status: 200, headers: %{"etag" => ["\"v1\""]}, body: @index}}
      end)
      {:ok, idx} = Client.index(client())
      assert idx.etag == "\"v1\""

      expect(Req, :get, fn _, opts ->
        assert {"if-none-match", "\"v1\""} in opts[:headers]
        {:ok, %Req.Response{status: 304, body: ""}}
      end)
      assert Client.index(client(), idx) == {:ok, idx}
    end

    test "it skips parsing an identical body from a host without conditional requests" do
      expect(Req, :get, 2, fn _, _ -> {:ok, %Req.Response{status: 200, body: @index}} end)
      {:ok, idx} = Client.index(client())

      assert Client.index(client(), idx) == {:ok, idx}
    end
  end

  defp client(), do: Client.client(%HelmRepository{url: "https://charts.example.com"})
end
