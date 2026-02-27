defmodule Console.Schema.DeploymentSettings.OpensearchTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.Schema.DeploymentSettings.Opensearch

  describe "changeset/2" do
    test "accepts use_pod_identity field" do
      changeset = Opensearch.changeset(%Opensearch{}, %{
        host: "https://opensearch.example.com",
        index: "logs",
        use_pod_identity: true
      })

      assert changeset.valid?
      assert get_change(changeset, :use_pod_identity) == true
    end

    test "has errors if use_pod_identity is false and aws_access_key_id and aws_secret_access_key are not set" do
      changeset = Opensearch.changeset(%Opensearch{}, %{
        host: "https://opensearch.example.com",
        index: "logs"
      })

      refute changeset.valid?
    end

    test "accepts all AWS credential fields" do
      changeset = Opensearch.changeset(%Opensearch{}, %{
        host: "https://opensearch.example.com",
        index: "logs",
        aws_access_key_id: "AKIAIOSFODNN7EXAMPLE",
        aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        aws_region: "us-east-1",
      })

      assert changeset.valid?
      assert get_change(changeset, :aws_access_key_id) == "AKIAIOSFODNN7EXAMPLE"
      assert get_change(changeset, :aws_region) == "us-east-1"
    end
  end

  describe "headers/2" do
    test "returns original headers when pod identity is enabled but no security token" do
      os = %Opensearch{use_pod_identity: true, aws_region: "us-east-1"}
      headers = [{"Content-Type", "application/json"}]

      result = Opensearch.headers(os, headers)

      assert result == headers
    end
  end

  describe "aws_sigv4_headers/1" do
    test "fetches credentials from ExAws when pod identity is enabled" do
      expect(ExAws.Config, :new, fn :es ->
        %{
          access_key_id: "mock-access-key",
          secret_access_key: "mock-secret-key",
          security_token: "mock-session-token",
          region: "us-west-2"
        }
      end)

      os = %Opensearch{
        use_pod_identity: true,
        aws_region: "us-west-2",
        aws_access_key_id: "should-be-ignored",
        aws_secret_access_key: "should-also-be-ignored"
      }

      result = Opensearch.aws_sigv4_headers(os)

      assert result[:service] == :es
      assert result[:region] == "us-west-2"
      assert result[:access_key_id] == "mock-access-key"
      assert result[:secret_access_key] == "mock-secret-key"
      assert result[:token] == "mock-session-token"
    end

    test "returns only service and region when ExAws credentials not found" do
      expect(ExAws.Config, :new, fn :es ->
        %{
          access_key_id: nil,
          secret_access_key: nil
        }
      end)

      os = %Opensearch{
        use_pod_identity: true,
        aws_region: "us-west-2"
      }

      result = Opensearch.aws_sigv4_headers(os)

      assert result[:service] == :es
      assert result[:region] == "us-west-2"
      refute Keyword.has_key?(result, :access_key_id)
      refute Keyword.has_key?(result, :secret_access_key)
    end

    test "returns full credentials when pod identity is disabled" do
      os = %Opensearch{
        use_pod_identity: false,
        aws_region: "us-west-2",
        aws_access_key_id: "AKIAIOSFODNN7EXAMPLE",
        aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      }

      result = Opensearch.aws_sigv4_headers(os)

      assert result[:service] == :es
      assert result[:region] == "us-west-2"
      assert result[:access_key_id] == "AKIAIOSFODNN7EXAMPLE"
      assert result[:secret_access_key] == "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    end

    test "falls back to env vars when credentials not set in config" do
      os = %Opensearch{
        use_pod_identity: false,
        aws_region: nil,
        aws_access_key_id: nil,
        aws_secret_access_key: nil
      }

      result = Opensearch.aws_sigv4_headers(os)

      assert result[:service] == :es
      assert Keyword.has_key?(result, :region)
      refute Keyword.has_key?(result, :access_key_id)
      refute Keyword.has_key?(result, :secret_access_key)
    end
  end

  describe "url/2" do
    test "joins host and path correctly" do
      os = %Opensearch{host: "https://opensearch.example.com"}

      assert Opensearch.url(os, "my-index/_search") == "https://opensearch.example.com/my-index/_search"
    end
  end
end
