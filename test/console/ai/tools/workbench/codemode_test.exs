defmodule Console.AI.Tools.Workbench.CodemodeTest do
  use ExUnit.Case, async: false
  use Mimic

  alias Console.AI.Tools.Workbench.Codemode
  alias Console.AI.Tools.Workbench.OutputType
  alias Console.AI.Tools.Workbench.Infrastructure.RawCloudQuery
  alias Console.AI.Tools.Workbench.Infrastructure.RawKubeList

  Mimic.copy(RawKubeList)

  setup :set_mimic_global

  test "executes Python against a mounted infrastructure tool" do
    expect(RawKubeList, :implement, fn %RawKubeList{
                                        cluster: "demo",
                                        version: "v1",
                                        kind: "Pod",
                                        namespace: "default"
                                      } ->
      {:ok, %{"items" => [%{"metadata" => %{"name" => "api"}}]}}
    end)

    sandbox = %Codemode{
      tools: [%RawKubeList{}],
      policies: [],
      python: """
      resources = list_k8s_resources(
          cluster="demo",
          version="v1",
          kind="Pod",
          namespace="default",
      )
      {"names": [item["metadata"]["name"] for item in resources["items"]]}
      """
    }

    assert {:ok, result} = Codemode.implement(sandbox)
    assert Jason.decode!(result) == %{"result" => %{"names" => ["api"]}, "stdout" => ""}
  end

  test "truncates oversized sandbox output" do
    sandbox = %Codemode{
      tools: [],
      policies: [],
      python: ~s|"x" * 120000|
    }

    assert {:ok, output} = Codemode.implement(sandbox)
    assert byte_size(output) == 100_000
    assert output =~ "output truncated at 100000 bytes"
  end

  test "passes raw cloud query results into the sandbox without JSON decoding" do
    result = [%{"name" => "demo-dev"}]

    assert OutputType.convert(%RawCloudQuery{}, result) == result
  end

  test "returns Python execution errors" do
    sandbox = %Codemode{
      tools: [],
      policies: [],
      python: ~s|raise ValueError("invalid sandbox input")|
    }

    assert {:error, message} = Codemode.implement(sandbox)
    assert message =~ "Failed to execute Python code"
    assert message =~ "invalid sandbox input"
  end

  test "allows scratch writes only through the in-memory overlay" do
    filename = "codemode-#{System.unique_integer([:positive])}.txt"
    host_path = Path.join(System.tmp_dir!(), filename)

    sandbox = %Codemode{
      tools: [],
      policies: [],
      python: """
      from pathlib import Path

      path = Path("/scratch/#{filename}")
      path.write_text("ephemeral")

      try:
          Path("/outside-scratch/#{filename}").write_text("not allowed")
      except PermissionError:
          outside_scratch_write_denied = True
      else:
          outside_scratch_write_denied = False

      {"scratch": path.read_text(), "outside_scratch_write_denied": outside_scratch_write_denied}
      """
    }

    assert {:ok, result} = Codemode.implement(sandbox)
    assert Jason.decode!(result) == %{
             "result" => %{"scratch" => "ephemeral", "outside_scratch_write_denied" => true},
             "stdout" => ""
           }

    refute File.exists?(host_path)
  end

  test "does not expose unhandled os APIs" do
    sandbox = %Codemode{
      tools: [],
      policies: [],
      python: ~s|import os\nos.getenv("HOME")|
    }

    assert {:error, message} = Codemode.implement(sandbox)
    assert message =~ "'os.getenv' is not supported in this environment"
  end

  test "does not expose sys APIs" do
    sandbox = %Codemode{
      tools: [],
      policies: [],
      python: ~s|import sys\nsys.exit()|
    }

    assert {:error, message} = Codemode.implement(sandbox)
    assert message =~ "module 'sys' has no attribute 'exit'"
  end

  test "returns value errors for invalid mounted tool arguments" do
    sandbox = %Codemode{
      tools: [%RawKubeList{}],
      policies: [],
      python: ~s|list_k8s_resources("not a dictionary", "extra")|
    }

    assert {:error, message} = Codemode.implement(sandbox)
    assert message =~ "value_error"
    assert message =~ "tool arguments must be keyword arguments or a single dictionary"
  end

  test "does not expose jq on raw Kubernetes list tools" do
    refute Map.has_key?(RawKubeList.json_schema(%RawKubeList{})["properties"], "jq")
  end
end
