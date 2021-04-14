defmodule Watchman.Services.PluralTest do
  use Watchman.DataCase, async: true
  use Mimic
  alias Watchman.Services.Plural

  describe "update_configuration/2" do
    @tag :skip
    test "it can update configuration in a Plural repo" do
      repo = "repo"
      expected_path = Path.join([Watchman.workspace(), repo, "helm", repo, "values.yaml"])
      expect(File, :write, fn ^expected_path, _ -> :ok end)

      {:ok, _} = Plural.update_configuration(repo, "updated: yaml", :helm)
    end

    @tag :skip
    test "It will fail on invalid yaml" do
      repo = "repo"
      {:error, _} = Plural.update_configuration(repo, "- key:", :helm)
    end
  end
end
