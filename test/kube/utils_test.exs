defmodule Kube.UtilsTest do
  use ExUnit.Case, async: true

  describe "redact_secret/1" do
    test "stars out secret data fields" do
      secret = %{
        "apiVersion" => "v1",
        "kind" => "Secret",
        "metadata" => %{"name" => "db"},
        "data" => %{"password" => "c2VjcmV0", "username" => "YWRtaW4="},
        "stringData" => %{"token" => "super-secret"}
      }

      assert Kube.Utils.redact_secret(secret) == %{
               "apiVersion" => "v1",
               "kind" => "Secret",
               "metadata" => %{"name" => "db"},
               "data" => %{"password" => "*****", "username" => "*****"},
               "stringData" => %{"token" => "*****"}
             }
    end

    test "leaves non-secret resources unchanged" do
      config_map = %{
        "apiVersion" => "v1",
        "kind" => "ConfigMap",
        "data" => %{"name" => "value"}
      }

      assert Kube.Utils.redact_secret(config_map) == config_map
    end

    test "redacts secret-path merge patches that omit kind" do
      patch = %{"stringData" => %{"token" => "super-secret"}}
      path = "/api/v1/namespaces/default/secrets/database"

      assert Kube.Utils.redact_secret(patch, path) == %{
               "kind" => "Secret",
               "stringData" => %{"token" => "*****"}
             }
      assert Kube.Utils.redact_secret(patch, "/api/v1/namespaces/default/configmaps/db") ==
               patch
    end
  end
end
