defmodule Kube.ResourceTest do
  use Console.DataCase, async: true
  alias Kube.Resource

  describe "#memory/1" do
    test "it will parse a k8s memory string" do
      {:ok, val} = Resource.memory("2Mi")

      assert val == 2 * 1024 * 1024

      {:ok, val} = Resource.memory("3G")

      assert val == 3 * 1000 * 1000 * 1000

      {:error, _} = Resource.memory("wtf")
    end
  end

  describe "#cpu/1" do
    test "it will parse a k8s cpu string" do
      {:ok, val} = Resource.cpu("200m")

      assert val == 200

      {:ok, val} = Resource.cpu("1.5")

      assert val == 1500

      {:error, _} = Resource.cpu("wtf")
    end
  end
end
