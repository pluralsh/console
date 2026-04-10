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

    test "converts cloudwatch tool to proto" do
      tool = %WorkbenchTool{
        tool: :cloudwatch,
        configuration: %{
          cloudwatch: %{
            region: "us-east-1",
            log_group_names: ["/aws/eks/prod/app"],
            access_key_id: "AKIA_TEST",
            secret_access_key: "SECRET",
            role_arn: "arn:aws:iam::123456789012:role/observability",
            external_id: "external-id",
            role_session_name: "plural-cloudwatch"
          }
        }
      }

      {:ok, res} = Conversion.to_proto(tool)
      {:ok, _} = Protobuf.JSON.encode(res)
      assert is_binary(Protobuf.encode(res))
    end
  end
end
