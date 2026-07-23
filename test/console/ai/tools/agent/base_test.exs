defmodule Console.AI.Tools.Agent.BaseTest do
  use Console.DataCase, async: true
  alias Console.AI.Tools.Agent.Base
  alias Console.Schema.CloudConnection
  alias Cloudquery.VSphereCredentials

  describe "to_pb/1" do
    test "converts vsphere cloud connections" do
      connection = insert(:cloud_connection,
        provider: :vsphere,
        configuration: %{
          vsphere: %{
            server: "https://vcenter.example.com/sdk",
            user: "administrator@vsphere.local",
            password: "password",
            allow_unverified_ssl: true
          }
        }
      )

      pb = Base.to_pb(connection)

      assert pb.provider == "vsphere"
      assert {:vsphere, %VSphereCredentials{} = credentials} = pb.credentials
      assert credentials.server == "https://vcenter.example.com/sdk"
      assert credentials.user == "administrator@vsphere.local"
      assert credentials.password == "password"
      assert credentials.allow_unverified_ssl == "true"
    end

    test "omits unset vsphere allow_unverified_ssl" do
      pb = Base.to_pb(vsphere_connection(nil))

      assert {:vsphere, %VSphereCredentials{} = credentials} = pb.credentials
      assert credentials.allow_unverified_ssl == nil
    end

    test "preserves explicit vsphere allow_unverified_ssl false" do
      pb = Base.to_pb(vsphere_connection(false))

      assert {:vsphere, %VSphereCredentials{} = credentials} = pb.credentials
      assert credentials.allow_unverified_ssl == "false"
    end
  end

  defp vsphere_connection(allow_unverified_ssl) do
    %CloudConnection{
      provider: :vsphere,
      configuration: %CloudConnection.Configuration{
        vsphere: %CloudConnection.Configuration.VSphere{
          server: "https://vcenter.example.com/sdk",
          user: "administrator@vsphere.local",
          password: "password",
          allow_unverified_ssl: allow_unverified_ssl
        }
      }
    }
  end
end
