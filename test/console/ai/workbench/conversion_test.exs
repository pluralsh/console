defmodule Console.AI.Workbench.ConversionTest do
  use Console.DataCase, async: true
  alias Console.Schema.WorkbenchTool
  alias Console.AI.Workbench.Conversion

  describe "to_proto/1" do
    test "converts elastic tool to proto" do
      tool = %WorkbenchTool{
        tool: :elastic,
        configuration: %{
          elastic: %{url: "https://elasticsearch.example.com", username: "elastic", password: "password", index: "logs"}
        }
      }

      {:ok, res} = Conversion.to_proto(tool)
      {:ok, _} = Protobuf.JSON.encode(res)
      assert is_binary(Protobuf.encode(res))
    end
  end
end
