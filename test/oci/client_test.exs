defmodule Console.OCI.ClientTest do
  use Console.DataCase, async: true
  alias Console.OCI.Client


  @mcr_runtime_repo "mcr.microsoft.com/dotnet/runtime"
  @mcr_runtime_linux_amd64_layer "sha256:068fedd6b0f109b8186d00d49327b6fc6747c428fd3c9a8739424ff5f38d7531"

  describe "#tags/2" do
    test "it can fetch tags from a public repo" do
      client = Client.new("oci://ghcr.io/pluralsh/console")

      {:ok, %{tags: [_ | _]}} = Client.tags(client)
    end
  end

  describe "download_blob/3" do
    test "streams unauthenticated MCR blobs to disk" do
      {:ok, tmp} = Briefly.create()

      client = Client.new(@mcr_runtime_repo)

      assert {:ok, %Req.Response{status: status}} =
                Client.download_blob(client, @mcr_runtime_linux_amd64_layer, File.stream!(tmp))

      assert status in 200..299
      assert {:ok, files} = :erl_tar.extract(tmp, [:compressed, :memory])
      assert Enum.any?(files)
    end
  end
end
