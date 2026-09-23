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

  describe "proxy configuration" do
    test "it configures the proxy as a req connect option" do
      client = Client.new("oci://ghcr.io/pluralsh/console", %{url: "http://proxy.example.com:8080", noproxy: nil})

      assert client.client.options.connect_options[:proxy] == {:http, "proxy.example.com", 8080, []}
      refute Map.has_key?(client.client.options, :proxy)

      client = put_in(client.client, Req.merge(client.client, plug: fn conn ->
        Req.Test.json(conn, %{"name" => "pluralsh/console", "tags" => ["0.1.0"]})
      end))

      assert {:ok, %{tags: ["0.1.0"]}} = Client.tags(client)
    end

    test "it can add a proxy to an existing client" do
      client =
        Client.new("oci://ghcr.io/pluralsh/console")
        |> Client.with_proxy(%{url: "https://proxy.example.com", noproxy: nil})

      assert client.client.options.connect_options[:proxy] == {:https, "proxy.example.com", 443, []}
    end

    test "it supports proxy urls without a scheme" do
      client = Client.new("oci://ghcr.io/pluralsh/console", %{url: "proxy.example.com:8080", noproxy: nil})

      assert client.client.options.connect_options[:proxy] == {:http, "proxy.example.com", 8080, []}
    end

    test "it skips the proxy for noproxy hosts" do
      client = Client.new("oci://ghcr.io/pluralsh/console", %{url: "http://proxy.example.com:8080", noproxy: "localhost,.ghcr.io"})

      refute client.client.options[:connect_options][:proxy]
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
