defmodule Console.Deployments.Issues.Webhook.ServiceNowTest do
  use ExUnit.Case, async: true

  alias Console.Deployments.Issues.Webhook.ServiceNow

  describe "record/1" do
    test "unwraps a Table API result and display value pairs" do
      {:ok, rec} =
        ServiceNow.record(%{
          "instance_url" => "https://example.service-now.com",
          "result" => %{
            "sys_class_name" => %{"value" => "problem", "display_value" => "Problem"},
            "number" => %{"value" => "PRB0040001", "display_value" => "PRB0040001"},
            "state" => %{"value" => "104", "display_value" => "Fix in Progress"}
          }
        })

      assert rec["table"] == "problem"
      assert rec["number"] == "PRB0040001"
      assert rec["state"] == "104"
      assert rec["display"]["state"] == "Fix in Progress"
      assert rec["instance_url"] == "https://example.service-now.com"
    end

    test "rejects other tables" do
      assert {:error, _} = ServiceNow.record(%{"table" => "sys_user", "sys_id" => "x"})
      assert {:error, _} = ServiceNow.record(%{"sys_id" => "x"})
    end
  end

  describe "status/1" do
    test "maps base system state codes per table" do
      for {table, state, status} <- [
            {"incident", "1", :open},
            {"incident", 2, :in_progress},
            {"incident", "3", :open},
            {"incident", "7", :completed},
            {"incident", "8", :cancelled},
            {"problem", "101", :open},
            {"problem", "103", :in_progress},
            {"problem", "107", :completed},
            {"change_request", "-5", :open},
            {"change_request", "-1", :in_progress},
            {"change_request", "3", :completed},
            {"change_request", "4", :cancelled},
            {"sc_task", "2", :in_progress},
            {"sc_task", "3", :completed},
            {"sc_task", "7", :cancelled}
          ] do
        {:ok, rec} = ServiceNow.record(%{"table" => table, "state" => state})
        assert ServiceNow.status(rec) == status, "#{table} state #{state}"
      end
    end

    test "falls back to labels for custom states" do
      {:ok, rec} = ServiceNow.record(%{"table" => "incident", "state" => "In Progress"})
      assert ServiceNow.status(rec) == :in_progress

      {:ok, rec} =
        ServiceNow.record(%{
          "table" => "incident",
          "state" => %{"value" => "42", "display_value" => "Closed Incomplete"}
        })

      assert ServiceNow.status(rec) == :cancelled
    end
  end

  test "builds a record link from the instance url" do
    {:ok, rec} =
      ServiceNow.record(%{
        "table" => "sc_task",
        "instance_url" => "https://example.service-now.com/",
        "sys_id" => "abc"
      })

    assert ServiceNow.url(rec) == "https://example.service-now.com/nav_to.do?uri=sc_task.do%3Fsys_id%3Dabc"
    assert ServiceNow.external_id(rec) == "abc"
    assert ServiceNow.body(rec) == "{empty}"
  end

  test "drops links that are not http(s)" do
    {:ok, rec} =
      ServiceNow.record(%{
        "table" => "incident",
        "sys_id" => "abc",
        "url" => "javascript:alert(1)",
        "instance_url" => "data:text/html,x"
      })

    assert ServiceNow.url(rec) == nil

    {:ok, rec} =
      ServiceNow.record(%{
        "table" => "incident",
        "sys_id" => "abc",
        "url" => "javascript:alert(1)",
        "instance_url" => "https://example.service-now.com"
      })

    assert ServiceNow.url(rec) == "https://example.service-now.com/nav_to.do?uri=incident.do%3Fsys_id%3Dabc"
  end
end
