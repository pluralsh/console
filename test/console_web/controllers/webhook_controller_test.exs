defmodule ConsoleWeb.WebhookControllerTest do
  use ConsoleWeb.ConnCase, async: true

  describe "#alertmanager/2" do
    test "it can accept an alertmanager webhook", %{conn: conn} do
      conn
      |> post("/alertmanager", %{})
      |> response(200)
    end
  end
end
