defmodule Console.AI.Workbench.FilesystemSandboxTest do
  use ExUnit.Case, async: false
  use Mimic
  alias Console.PseudoFS
  alias Console.AI.Tools.Workbench.Codemode

  @tenant "a8c4f0e2-2b5e-4d3a-9a77-0d0b6f3c9f10"

  setup :set_mimic_global

  test "csv and yaml helpers return python values in the sandbox" do
    stub(PseudoFS, :enabled?, fn -> true end)
    stub(PseudoFS, :read_text, fn
      @tenant, "/clusters.csv" -> {:ok, "name,score\nmgmt,92\nprod\n"}
      @tenant, "/values.yaml" -> {:ok, "replicas: 2\nimage: {tag: v1}\n---\nkind: Service\n"}
    end)

    python = """
    data = read_csv("/workbench/clusters.csv")
    docs = read_yaml("/workbench/values.yaml")
    {
      "names": [r["name"] for r in data["rows"]],
      "missing": data["rows"][1]["score"] is None,
      "truncated": data["truncated"],
      "tag": docs[0]["image"]["tag"],
      "replicas": docs[0]["replicas"] + 1,
      "kinds": [d.get("kind") for d in docs],
    }
    """

    {:ok, out} = Codemode.implement(%Codemode{tools: [], python: python, workbench_id: @tenant})
    assert %{"result" => result} = Jason.decode!(out)
    assert result == %{
      "names" => ["mgmt", "prod"],
      "missing" => true,
      "truncated" => false,
      "tag" => "v1",
      "replicas" => 3,
      "kinds" => [nil, "Service"]
    }
  end
end
