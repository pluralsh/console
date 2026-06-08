defmodule Console.Schema.ServiceTest do
  use Console.DataCase, async: true

  alias Console.Schema.Service

  describe "Helm.changeset/2" do
    test "accepts url-backed charts with a chart and version" do
      changeset =
        Service.Helm.changeset(%Service.Helm{}, %{
          url: "https://charts.example.com",
          chart: "podinfo",
          version: "5.0.0"
        })

      assert changeset.valid?
    end

    test "requires chart when url is provided" do
      changeset =
        Service.Helm.changeset(%Service.Helm{}, %{
          url: "https://charts.example.com",
          version: "5.0.0"
        })

      refute changeset.valid?
      assert "can't be blank" in errors_on(changeset).chart
    end

    test "requires version when url is provided" do
      changeset =
        Service.Helm.changeset(%Service.Helm{}, %{
          url: "https://charts.example.com",
          chart: "podinfo"
        })

      refute changeset.valid?
      assert "can't be blank" in errors_on(changeset).version
    end

    test "requires nonempty chart and version when url is provided" do
      changeset =
        Service.Helm.changeset(%Service.Helm{}, %{
          url: "https://charts.example.com",
          chart: " ",
          version: ""
        })

      refute changeset.valid?
      assert "can't be blank" in errors_on(changeset).chart
      assert "can't be blank" in errors_on(changeset).version
    end
  end
end
