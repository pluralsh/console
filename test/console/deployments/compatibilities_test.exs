defmodule Console.Deployments.CompatibilitiesTest do
  use ExUnit.Case, async: false
  use Mimic
  alias Console.Deployments.Compatibilities.{AddOn, CloudAddOn, Reference, Table, Version, VersionSummary}
  alias Console.Schema.Cluster
  alias Console.Utils.HTTP

  setup :set_mimic_global

  describe "AddOn.new/1" do
    test "it builds the same structs as the old json round trip for every static matrix" do
      spec = %AddOn{versions: [%Version{
        requirements: [%Reference{}],
        incompatibilities: [%Reference{}],
        summary: %VersionSummary{}
      }]}

      {:ok, %{"names" => names}} = Console.Utils.Yaml.decode(File.read!("static/compatibilities/manifest.yaml"))
      for name <- names do
        {:ok, raw} = Console.Utils.Yaml.decode(File.read!("static/compatibilities/#{name}.yaml"))
        {:ok, old} = Poison.decode(Jason.encode!(raw), as: spec)

        new = AddOn.new(raw)
        assert %{new | versions: Enum.map(new.versions, &%{&1 | semver: nil})} == old
        assert Enum.all?(new.versions, &match?(%Elixir.Version{}, &1.semver))
      end

      assert length(Table.static()) == length(names)
    end

    test "it stringifies numeric versions and drops malformed entries" do
      addon = AddOn.new(%{"name" => "a", "versions" => [%{"version" => 1.2, "kube" => ["1.30"]}, "junk"]})

      assert [%Version{version: "1.2", semver: %Elixir.Version{major: 1, minor: 2, patch: 0}}] = addon.versions
    end
  end

  describe "CloudAddOn.new/2" do
    test "it matches the old json round trip for the static cloud addons" do
      {:ok, %{"platforms" => platforms}} = Console.Utils.Yaml.decode(File.read!("static/addons/manifest.yaml"))
      for platform <- platforms do
        {:ok, raw} = Console.Utils.Yaml.decode(File.read!("static/addons/#{platform}.yaml"))
        {:ok, old} = Poison.decode(Jason.encode!(raw), as: [%CloudAddOn{versions: [%CloudAddOn.Version{}]}])
        distro = String.to_existing_atom(platform)

        assert Enum.map(raw, &CloudAddOn.new(&1, distro)) == Enum.map(old, &%{&1 | distro: distro})
      end
    end
  end

  describe "AddOn.find_version/2" do
    test "it finds the newest version at or below the target regardless of order" do
      addon = addon(~w(1.2.0 1.10.0 1.9.1 v1.11.0 2.0))

      assert find(addon, "1.10.0") == "1.10.0"
      assert find(addon, "1.10.5") == "1.10.0"
      assert find(addon, "v1.9.3") == "1.9.1"
      assert find(addon, "1.11") == "v1.11.0"
      assert find(addon, "2.0.0") == "2.0"
      assert find(addon, "3.0.0") == "2.0"
      assert find(addon, "1.0.0") == nil
    end

    test "it skips entries that aren't semver and rejects bad targets" do
      addon = addon(["1.0.0", "latest", nil, "1.4.0"])

      assert find(addon, "1.3.0") == "1.0.0"
      assert find(addon, "nonsense") == nil
      assert AddOn.find_version(addon, nil) == nil
      assert AddOn.find_version(%AddOn{versions: []}, "1.0.0") == nil
    end

    test "it works on structs built without the cached semver" do
      addon = %AddOn{versions: [%Version{version: "1.0.0"}, %Version{version: "1.5.0"}]}
      assert %Version{version: "1.5.0"} = AddOn.find_version(addon, "1.6.0")
    end
  end

  describe "upgrade_version/3" do
    test "it picks the lowest newer version supporting the next kube minor, regardless of order" do
      addon = AddOn.new(%{"versions" => [
        %{"version" => "1.3.0", "kube" => ["1.31", "1.30"]},
        %{"version" => "1.1.0", "kube" => ["1.30"]},
        %{"version" => "1.2.0", "kube" => ["v1.31.0"]},
        %{"version" => "1.4.0", "kube" => ["1.32", "1.31"]}
      ]})
      cluster = %Cluster{current_version: "1.30"}

      assert %Version{version: "1.2.0"} = AddOn.upgrade_version(addon, cluster)
      assert %Version{version: "1.3.0"} = AddOn.upgrade_version(addon, cluster, "1.2.0")
      assert %Version{version: "1.2.0"} = AddOn.upgrade_version(addon, cluster, "not-semver")
      assert AddOn.upgrade_version(addon, cluster, "1.4.0") == nil
      assert AddOn.upgrade_version(addon, %Cluster{current_version: nil}) == nil
    end

    test "cloud addons use the same lookup" do
      addon = CloudAddOn.new(%{"name" => "vpc-cni", "versions" => [
        %{"version" => "v1.19.0-eksbuild.1", "compatibilities" => ["1.32"]},
        %{"version" => "v1.18.0-eksbuild.1", "compatibilities" => ["1.31", "1.32"]}
      ]}, :eks)

      assert %CloudAddOn.Version{version: "v1.18.0-eksbuild.1"} =
        CloudAddOn.upgrade_version(addon, %Cluster{current_version: "1.31.4"})
    end
  end

  describe "HTTP.fetch_if_changed/3" do
    @url "https://assets.example.com/compatibilities.yaml"

    test "it revalidates with the previous validators and reports unchanged bodies" do
      expect(Req, :get, fn @url, opts ->
        assert opts[:headers] == []
        {:ok, %Req.Response{status: 200, headers: %{"etag" => ["\"v1\""]}, body: "a"}}
      end)
      {:ok, "a", v1} = HTTP.fetch_if_changed(@url, nil)
      assert v1.etag == "\"v1\""

      expect(Req, :get, fn @url, opts ->
        assert {"if-none-match", "\"v1\""} in opts[:headers]
        {:ok, %Req.Response{status: 304}}
      end)
      assert {:ok, :unchanged, ^v1} = HTTP.fetch_if_changed(@url, v1)

      expect(Req, :get, fn @url, _ ->
        {:ok, %Req.Response{status: 200, headers: %{"etag" => ["\"v2\""]}, body: "a"}}
      end)
      {:ok, :unchanged, v2} = HTTP.fetch_if_changed(@url, v1)
      assert v2.etag == "\"v2\""

      expect(Req, :get, fn @url, _ -> {:ok, %Req.Response{status: 200, body: "b"}} end)
      assert {:ok, "b", _} = HTTP.fetch_if_changed(@url, v2)

      expect(Req, :get, fn @url, _ -> {:ok, %Req.Response{status: 500}} end)
      assert {:error, _} = HTTP.fetch_if_changed(@url, v2)
    end
  end

  defp addon(versions), do: AddOn.new(%{"versions" => Enum.map(versions, &%{"version" => &1})})

  defp find(addon, vsn) do
    case AddOn.find_version(addon, vsn) do
      %Version{version: v} -> v
      nil -> nil
    end
  end
end
