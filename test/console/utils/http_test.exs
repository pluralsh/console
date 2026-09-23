defmodule Console.Utils.HTTPTest do
  use ExUnit.Case, async: true

  alias Console.Utils.HTTP

  describe "proxy_options/2" do
    test "builds proxy connect options" do
      opts = HTTP.proxy_options(%{url: "http://proxy.example.com:3128"}, "https://registry.example.com/v2")

      assert opts[:connect_options][:proxy] == {:http, "proxy.example.com", 3128, []}
    end

    test "skips the proxy for exact and suffix noproxy matches" do
      proxy = %{url: "http://proxy.example.com:3128", noproxy: "localhost, .internal.example.com"}

      assert HTTP.proxy_options(proxy, "http://localhost:5000/v2") == []
      assert HTTP.proxy_options(proxy, "https://registry.internal.example.com/v2") == []
      assert HTTP.proxy_options(proxy, "https://internal.example.com/v2") == []
      assert HTTP.proxy_options(proxy, "https://registry.example.com/v2")[:connect_options][:proxy]
    end

    test "does nothing without a proxy url" do
      assert HTTP.proxy_options(nil, "https://registry.example.com") == []
      assert HTTP.proxy_options(%{url: nil}, "https://registry.example.com") == []
      assert HTTP.proxy_options(%{url: ""}, "https://registry.example.com") == []
    end
  end
end
