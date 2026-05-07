defmodule Console.AI.Evidence.ServiceTest do
  use Console.DataCase, async: true
  alias Console.Repo
  alias Console.AI.Evidence
  alias Console.Schema.ServiceError

  describe "Console.AI.Evidence.Service.generate/1" do
    test "returns no history when there are no errors and component_status counts match" do
      service = build(:service, status: :stale, component_status: "3 / 3", errors: [])

      assert Evidence.generate(service) == {:ok, [], %{}}
    end

    test "returns no history when component_status is '0 / 0' with no errors" do
      service = build(:service, status: :stale, component_status: "0 / 0", errors: [])

      assert Evidence.generate(service) == {:ok, [], %{}}
    end

    test "tolerates whitespace variations in component_status when deciding nothing changed" do
      service = build(:service, status: :stale, component_status: "5/5", errors: [])

      assert Evidence.generate(service) == {:ok, [], %{}}
    end

    test "generates history when component_status counts diverge" do
      service =
        insert(:service, status: :stale, component_status: "1 / 3", errors: [])
        |> Evidence.preload()

      assert {:ok, [_ | _] = history, %{evidence: _}} = Evidence.generate(service)
      assert Enum.any?(history, fn
               {:user, msg} when is_binary(msg) -> String.contains?(msg, service.name)
               _ -> false
             end)
    end

    test "generates history when the service has errors even with matching component_status" do
      service = insert(:service, status: :failed, component_status: "3 / 3")

      Repo.insert!(%ServiceError{
        source: "manifests",
        message: "some error",
        service_id: service.id
      })

      service = Evidence.preload(service)

      assert {:ok, [_ | _] = history, %{evidence: _}} = Evidence.generate(service)
      assert Enum.any?(history, fn
               {:user, msg} when is_binary(msg) -> String.contains?(msg, "some error")
               _ -> false
             end)
    end
  end
end
