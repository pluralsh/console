defmodule Console.AI.Workbench.ConversionTest do
  use Console.DataCase, async: true
  alias Console.Schema.WorkbenchTool
  alias Console.AI.Workbench.Conversion
  alias Toolquery.{PrometheusConnection, ToolConnection}

  describe "to_proto/1" do
    test "passes through an already built tool connection" do
      conn = %ToolConnection{
        connection: {:prometheus, %PrometheusConnection{url: "https://prometheus.example.com"}}
      }

      assert {:ok, ^conn} = Conversion.to_proto(conn)
    end

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

    test "converts opensearch tool to proto" do
      tool = %WorkbenchTool{
        tool: :opensearch,
        configuration: %{
          opensearch: %{
            host: "https://search-domain.us-east-1.es.amazonaws.com",
            index: "logs",
            aws_region: "us-east-1",
            assume_role_arn: "arn:aws:iam::123456789012:role/opensearch-readonly",
            use_pod_identity: true
          }
        }
      }

      {:ok, res} = Conversion.to_proto(tool)
      {:opensearch, opensearch} = res.connection

      assert opensearch.host == "https://search-domain.us-east-1.es.amazonaws.com"
      assert opensearch.index == "logs"
      assert opensearch.aws_region == "us-east-1"
      assert opensearch.assume_role_arn == "arn:aws:iam::123456789012:role/opensearch-readonly"
      assert opensearch.use_pod_identity
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

    test "converts prometheus sigv4 config to proto" do
      tool = insert(:workbench_tool,
        tool: :prometheus,
        configuration: %{
          prometheus: %{
            url: "https://aps-workspaces.us-east-1.amazonaws.com/workspaces/ws-123",
            aws_sigv4: true,
            aws_access_key_id: "AKIA_TEST",
            aws_secret_access_key: "SECRET",
            aws_region: "us-east-1"
          }
        }
      )

      {:ok, res} = Conversion.to_proto(tool)
      {:prometheus, prom} = res.connection

      assert prom.aws_sigv4
      assert prom.aws_access_key_id == "AKIA_TEST"
      assert prom.aws_secret_access_key == "SECRET"
      assert prom.aws_region == "us-east-1"
      {:ok, _} = Protobuf.JSON.encode(res)
      assert is_binary(Protobuf.encode(res))
    end
  end
end
