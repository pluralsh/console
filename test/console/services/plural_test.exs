defmodule Console.Services.PluralTest do
  use Console.DataCase, async: false
  use Mimic
  alias Console.Services.Plural

  setup :set_mimic_global

  describe "update_configuration/2" do
    @tag :skip
    test "it can update configuration in a Plural repo" do
      repo = "repo"
      expected_path = Path.join([Console.workspace(), repo, "helm", repo, "values.yaml"])
      expect(File, :write, fn ^expected_path, _ -> :ok end)

      {:ok, _} = Plural.update_configuration(repo, "updated: yaml", :helm)
    end

    @tag :skip
    test "It will fail on invalid yaml" do
      repo = "repo"
      {:error, _} = Plural.update_configuration(repo, "- key:", :helm)
    end
  end

  describe "#merge_config/2" do
    test "it can apply path updates appropriately" do
      {:ok, formatted} = Console.Utils.Yaml.format(%{"a" => %{"b" => [1, %{"c" => 2}]}})
      expect(File, :read, fn _ -> {:ok, formatted} end)
      expect(File, :write, fn _, _ -> :ok end)

      {:ok, res} = Plural.merge_config("console", [
        %{path: ".a.b[1].c", value: "3", type: :int},
        %{path: ".a.b[0]", value: "0", type: :int},
        %{path: ".d", value: "hey", type: :string},
      ])
      {:ok, %{"a" => %{"b" => [0, %{"c" => 3}]}, "d" => "hey"}} = YamlElixir.read_from_string(res)
    end
  end
end
