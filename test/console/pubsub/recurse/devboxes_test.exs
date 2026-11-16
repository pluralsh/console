defmodule Console.Recurse.DevboxesTest do
  use Console.DataCase, async: true
  use Mimic
  alias Console.PubSub
  alias Console.PubSub.Consumers.Recurse
  alias Console.Devboxes.Control

  describe "DevboxInstanceEnded" do
    test "it asks the gateway to delete the actor" do
      inst = insert(:devbox_instance, status: :cancelled)
      expect(Control.Test, :cancel_instance, fn %{id: id} ->
        assert id == inst.id
        :ok
      end)

      :ok = Recurse.handle_event(%PubSub.DevboxInstanceEnded{item: inst})
    end

    test "it tolerates an offline cluster or a failed call" do
      inst = insert(:devbox_instance, status: :completed)
      expect(Control.Test, :cancel_instance, fn _ -> {:error, :not_connected} end)
      :ok = Recurse.handle_event(%PubSub.DevboxInstanceEnded{item: inst})

      expect(Control.Test, :cancel_instance, fn _ -> {:error, "deadline exceeded"} end)
      :ok = Recurse.handle_event(%PubSub.DevboxInstanceEnded{item: inst})
    end
  end
end
