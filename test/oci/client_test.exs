defmodule Console.OCI.ClientTest do
  use Console.DataCase, async: true
  alias Console.OCI.Client

  describe "#tags/2" do
    test "it can fetch tags from a public repo" do
      client = Client.new("oci://ghcr.io/pluralsh/console")

      {:ok, %{tags: [_ | _]}} = Client.tags(client)
    end
  end
end
