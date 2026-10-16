defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.ChangeToolsTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.{
    CheckConflicts,
    CreateChange,
    GetChange,
    ListChangeApprovals,
    ListChangeTasks,
    ListStates,
    SaveChangeTask,
    TransitionRecord
  }

  alias Console.Schema.WorkbenchTool

  @sys_id "0123456789abcdef0123456789abcdef"
  @task_id "fedcba9876543210fedcba9876543210"
  @table "https://example.service-now.com/api/now"
  @change "https://example.service-now.com/api/sn_chg_rest/v1"

  @next_states ~s({"result":{
    "available_states":["-5","-4"],
    "state_label":{"-5":"New","-4":"Assess"},
    "state_transitions":[{"from_state":"-5","to_state":"-4","transition_available":true}]
  }})

  @choices ~s({"result":[
    {"value":"1","label":"New"},
    {"value":"2","label":"In Progress"},
    {"value":"2","label":"In Progress"},
    {"value":"6","label":"Resolved"}
  ]})

  describe "list_states" do
    test "reads the english state choices of a table" do
      expect(Req, :request, fn opts ->
        uri = URI.parse(opts[:url])
        assert uri.path == "/api/now/table/sys_choice"

        query = URI.decode_query(uri.query)
        assert query["sysparm_query"] =~ "name=incident^element=state^inactive=false^language=en"

        {:ok, %Req.Response{status: 200, body: @choices}}
      end)

      assert {:ok, encoded} = run(ListStates, %{"table" => "incident"})

      assert %{"states" => [%{"value" => "1"}, %{"value" => "2", "label" => "In Progress"}, %{"value" => "6"}]} =
               Jason.decode!(encoded)
    end

    test "falls back to the task choices when the table has none" do
      expect(Req, :request, fn opts ->
        assert URI.decode_query(URI.parse(opts[:url]).query)["sysparm_query"] =~ "name=sc_task^"
        {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}}
      end)

      expect(Req, :request, fn opts ->
        assert URI.decode_query(URI.parse(opts[:url]).query)["sysparm_query"] =~ "name=task^"
        {:ok, %Req.Response{status: 200, body: @choices}}
      end)

      assert {:ok, encoded} = run(ListStates, %{"table" => "sc_task"})
      assert %{"states" => [_, _, _]} = Jason.decode!(encoded)
    end

    test "lists the next states of a change from the Change Management API" do
      expect(Req, :request, fn opts ->
        assert opts[:method] == :get
        assert opts[:url] == "#{@change}/change/#{@sys_id}/nextstates"
        {:ok, %Req.Response{status: 200, body: @next_states}}
      end)

      assert {:ok, encoded} = run(ListStates, %{"table" => "change_request", "record_id" => @sys_id})
      assert %{"nextStates" => %{"available_states" => ["-5", "-4"]}} = Jason.decode!(encoded)
    end
  end

  describe "transition_record" do
    test "resolves a label to the raw value and patches the table" do
      expect(Req, :request, fn opts ->
        assert opts[:url] =~ "#{@table}/table/sys_choice"
        {:ok, %Req.Response{status: 200, body: @choices}}
      end)

      expect(Req, :request, fn opts ->
        assert opts[:method] == :patch
        assert opts[:url] =~ "#{@table}/table/incident/#{@sys_id}"

        assert Jason.decode!(opts[:body]) == %{
                 "state" => "6",
                 "close_code" => "Solved (Permanently)",
                 "close_notes" => "fixed"
               }

        {:ok, %Req.Response{status: 200, body: ~s({"result":{"state":"6"}})}}
      end)

      assert {:ok, encoded} =
               run(TransitionRecord, %{
                 "table" => "incident",
                 "record_id" => @sys_id,
                 "state" => "resolved",
                 "fields" => %{"close_code" => "Solved (Permanently)", "close_notes" => "fixed"}
               })

      assert %{"state" => "6", "record" => %{"state" => "6"}} = Jason.decode!(encoded)
    end

    test "lists the valid states instead of writing when the state is unknown" do
      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: @choices}} end)

      assert {:error, msg} = run(TransitionRecord, %{"table" => "incident", "record_id" => @sys_id, "state" => "banana"})
      assert msg =~ "not available"
      assert msg =~ "6 (Resolved)"
    end

    test "passes a ServiceNow rejection through" do
      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: @choices}} end)

      expect(Req, :request, fn _ ->
        {:ok, %Req.Response{status: 403, body: ~s({"error":{"message":"Operation Failed","detail":"close_code is mandatory"}})}}
      end)

      assert {:error, msg} = run(TransitionRecord, %{"table" => "incident", "record_id" => @sys_id, "state" => "6"})
      assert msg =~ "close_code is mandatory"
    end

    test "checks a change against its next states and patches through the Change API" do
      expect(Req, :request, fn _ ->
        {:ok, %Req.Response{status: 200, body: ~s({"result":[{"value":"-5","label":"New"},{"value":"-4","label":"Assess"}]})}}
      end)

      expect(Req, :request, fn opts ->
        assert opts[:url] == "#{@change}/change/#{@sys_id}/nextstates"
        {:ok, %Req.Response{status: 200, body: @next_states}}
      end)

      expect(Req, :request, fn opts ->
        assert opts[:method] == :patch
        assert opts[:url] == "#{@change}/change/#{@sys_id}"
        assert Jason.decode!(opts[:body]) == %{"state" => "-4"}
        {:ok, %Req.Response{status: 200, body: ~s({"result":{"number":{"value":"CHG1"}}})}}
      end)

      assert {:ok, _} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "assess"})
    end

    test "refuses a change state that is not a next state" do
      expect(Req, :request, fn _ ->
        {:ok, %Req.Response{status: 200, body: ~s({"result":[{"value":"-5","label":"New"},{"value":"3","label":"Closed"}]})}}
      end)

      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: @next_states}} end)

      assert {:error, msg} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "closed"})
      assert msg =~ "Available states"
      assert msg =~ "-4 (Assess)"
    end

    test "accepts a state that only the change model knows about" do
      # no choices for the table, then none for the task fallback either
      expect(Req, :request, 2, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)

      expect(Req, :request, fn _ ->
        {:ok, %Req.Response{status: 200, body: ~s({"result":{"available_states":["-4","99"],"state_label":{"99":"Peer review"}}})}}
      end)

      expect(Req, :request, fn opts ->
        assert Jason.decode!(opts[:body]) == %{"state" => "99"}
        {:ok, %Req.Response{status: 200, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "peer review"})
    end

    test "lets ServiceNow decide when the next states cannot be read" do
      # no choices for the table, then none for the task fallback either
      expect(Req, :request, 2, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)
      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":{"unexpected":true}})}} end)

      expect(Req, :request, fn opts ->
        assert Jason.decode!(opts[:body]) == %{"state" => "3"}
        {:ok, %Req.Response{status: 200, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "3"})
    end

    test "lets ServiceNow decide when the next states request fails" do
      expect(Req, :request, 2, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)
      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 403, body: ~s({"error":{"message":"denied"}})}} end)

      expect(Req, :request, fn opts ->
        assert Jason.decode!(opts[:body]) == %{"state" => "-1"}
        {:ok, %Req.Response{status: 200, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "-1"})
    end

    test "does not accept a transition whose conditions are not met" do
      expect(Req, :request, 2, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)

      expect(Req, :request, fn _ ->
        body = ~s({"result":{
          "available_states":["-5"],
          "state_label":{"-5":{"display_value":"New"},"-2":"Scheduled"},
          "state_transitions":[{"to_state":"-2","transition_available":false}]
        }})

        {:ok, %Req.Response{status: 200, body: body}}
      end)

      assert {:error, msg} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "-2"})
      assert msg =~ "Available states: -5 (New)."
    end

    test "sends the raw state when the state choices cannot be read" do
      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 403, body: ~s({"error":{"message":"denied"}})}} end)

      expect(Req, :request, fn opts ->
        assert Jason.decode!(opts[:body]) == %{"state" => "6"}
        {:ok, %Req.Response{status: 200, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} = run(TransitionRecord, %{"table" => "problem", "record_id" => @sys_id, "state" => "6"})
    end
  end

  describe "create_change" do
    test "creates a normal change with a model and the plans" do
      expect(Req, :request, fn opts ->
        assert opts[:method] == :post
        uri = URI.parse(opts[:url])
        assert "#{uri.scheme}://#{uri.host}#{uri.path}" == "#{@change}/change"
        assert URI.decode_query(uri.query) == %{"type" => "normal", "chg_model" => "Normal"}

        assert Jason.decode!(opts[:body]) == %{
                 "short_description" => "Upgrade db",
                 "implementation_plan" => "run the migration",
                 "backout_plan" => "restore the snapshot",
                 "test_plan" => "smoke test",
                 "justification" => "security patch"
               }

        {:ok, %Req.Response{status: 201, body: ~s({"result":{"number":{"value":"CHG0040001"}}})}}
      end)

      assert {:ok, encoded} =
               run(CreateChange, %{
                 "model" => "Normal",
                 "short_description" => "Upgrade db",
                 "implementation_plan" => "run the migration",
                 "backout_plan" => "restore the snapshot",
                 "test_plan" => "smoke test",
                 "fields" => %{"justification" => "security patch"}
               })

      assert %{"result" => %{"number" => %{"value" => "CHG0040001"}}} = Jason.decode!(encoded)
    end

    test "without a model it uses the endpoint of the type" do
      expect(Req, :request, fn opts ->
        assert opts[:url] == "#{@change}/change/emergency"
        {:ok, %Req.Response{status: 201, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} = run(CreateChange, %{"type" => "emergency", "short_description" => "fire"})
    end

    test "null arguments are validation errors, not crashes" do
      assert {:error, changeset} =
               %CreateChange{tool: workbench_tool()}
               |> CreateChange.changeset(%{"type" => nil, "short_description" => "x", "fields" => nil})
               |> Ecto.Changeset.apply_action(:update)

      assert %{type: [_]} = errors_on(changeset)

      expect(Req, :request, fn opts ->
        assert Jason.decode!(opts[:body]) == %{"short_description" => "x"}
        {:ok, %Req.Response{status: 201, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} = run(CreateChange, %{"short_description" => "x", "fields" => nil})
    end

    test "standard changes need a template and cannot take plans" do
      assert {:error, changeset} =
               %CreateChange{tool: workbench_tool()}
               |> CreateChange.changeset(%{"type" => "standard", "short_description" => "x"})
               |> Ecto.Changeset.apply_action(:update)

      assert %{template_id: [_]} = errors_on(changeset)

      assert {:error, changeset} =
               %CreateChange{tool: workbench_tool()}
               |> CreateChange.changeset(%{
                 "type" => "standard",
                 "template_id" => @sys_id,
                 "short_description" => "x",
                 "backout_plan" => "nope"
               })
               |> Ecto.Changeset.apply_action(:update)

      assert %{backout_plan: [_]} = errors_on(changeset)

      assert {:error, changeset} =
               %CreateChange{tool: workbench_tool()}
               |> CreateChange.changeset(%{
                 "type" => "standard",
                 "template_id" => @sys_id,
                 "short_description" => "x",
                 "model" => "Normal",
                 "fields" => %{"test_plan" => "nope"}
               })
               |> Ecto.Changeset.apply_action(:update)

      assert %{model: [_]} = errors_on(changeset)

      expect(Req, :request, fn opts ->
        assert opts[:url] == "#{@change}/change/standard/#{@sys_id}"
        assert Jason.decode!(opts[:body]) == %{"short_description" => "x"}
        {:ok, %Req.Response{status: 201, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} =
               run(CreateChange, %{"type" => "standard", "template_id" => @sys_id, "short_description" => "x"})
    end

    test "rejects an unknown change type" do
      assert {:error, changeset} =
               %CreateChange{tool: workbench_tool()}
               |> CreateChange.changeset(%{"type" => "weird", "short_description" => "x"})
               |> Ecto.Changeset.apply_action(:update)

      assert %{type: [_]} = errors_on(changeset)
    end
  end

  describe "change reads" do
    test "get_change reads the full change" do
      expect(Req, :request, fn opts ->
        assert opts[:url] == "#{@change}/change/#{@sys_id}"
        {:ok, %Req.Response{status: 200, body: ~s({"result":{"state":{"value":"-5","display_value":"New"}}})}}
      end)

      assert {:ok, encoded} = run(GetChange, %{"record_id" => @sys_id})
      assert %{"result" => %{"state" => %{"display_value" => "New"}}} = Jason.decode!(encoded)
    end

    test "list_change_tasks pages through the tasks" do
      expect(Req, :request, fn opts ->
        uri = URI.parse(opts[:url])
        assert uri.path == "/api/sn_chg_rest/v1/change/#{@sys_id}/task"
        assert %{"sysparm_limit" => "1", "sysparm_offset" => "2"} = URI.decode_query(uri.query)
        {:ok, %Req.Response{status: 200, body: ~s({"result":[{"number":{"value":"CTASK1"}}]})}}
      end)

      assert {:ok, encoded} = run(ListChangeTasks, %{"record_id" => @sys_id, "limit" => 1, "cursor" => "2"})
      assert %{"nextCursor" => "3"} = Jason.decode!(encoded)
    end

    test "list_change_approvals reads the approvals of the change" do
      expect(Req, :request, fn opts ->
        uri = URI.parse(opts[:url])
        assert uri.path == "/api/now/table/sysapproval_approver"
        assert URI.decode_query(uri.query)["sysparm_query"] == "sysapproval=#{@sys_id}^ORDERBYsys_created_on"
        {:ok, %Req.Response{status: 200, body: ~s({"result":[{"approver":"Abel","state":"requested"}]})}}
      end)

      assert {:ok, encoded} = run(ListChangeApprovals, %{"record_id" => @sys_id})
      assert %{"result" => [%{"state" => "requested"}]} = Jason.decode!(encoded)
    end
  end

  describe "change writes" do
    test "save_change_task creates a task without a task id" do
      expect(Req, :request, fn opts ->
        assert opts[:method] == :post
        assert opts[:url] == "#{@change}/change/#{@sys_id}/task"
        assert Jason.decode!(opts[:body]) == %{"short_description" => "Run it", "assigned_to" => "abel"}
        {:ok, %Req.Response{status: 201, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} =
               run(SaveChangeTask, %{
                 "record_id" => @sys_id,
                 "short_description" => "Run it",
                 "fields" => %{"assigned_to" => "abel"}
               })
    end

    test "save_change_task updates an existing task" do
      expect(Req, :request, fn opts ->
        assert opts[:method] == :patch
        assert opts[:url] == "#{@change}/change/#{@sys_id}/task/#{@task_id}"
        assert Jason.decode!(opts[:body]) == %{"state" => "3"}
        {:ok, %Req.Response{status: 200, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} =
               run(SaveChangeTask, %{"record_id" => @sys_id, "task_id" => @task_id, "fields" => %{"state" => "3"}})
    end

    test "save_change_task accepts a description only update and null fields" do
      expect(Req, :request, fn opts ->
        assert Jason.decode!(opts[:body]) == %{"description" => "more detail"}
        {:ok, %Req.Response{status: 200, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} =
               run(SaveChangeTask, %{
                 "record_id" => @sys_id,
                 "task_id" => @task_id,
                 "description" => "more detail",
                 "fields" => nil
               })
    end

    test "save_change_task needs a summary to create and a field to update" do
      assert {:error, changeset} =
               %SaveChangeTask{tool: workbench_tool()}
               |> SaveChangeTask.changeset(%{"record_id" => @sys_id})
               |> Ecto.Changeset.apply_action(:update)

      assert %{short_description: [_]} = errors_on(changeset)

      assert {:error, changeset} =
               %SaveChangeTask{tool: workbench_tool()}
               |> SaveChangeTask.changeset(%{"record_id" => @sys_id, "task_id" => @task_id})
               |> Ecto.Changeset.apply_action(:update)

      assert %{fields: [_]} = errors_on(changeset)
    end

    test "check_conflicts starts a conflict check" do
      expect(Req, :request, fn opts ->
        assert opts[:method] == :post
        assert opts[:url] == "#{@change}/change/#{@sys_id}/conflict"
        {:ok, %Req.Response{status: 200, body: ~s({"result":{"sys_id":"p1"}})}}
      end)

      assert {:ok, encoded} = run(CheckConflicts, %{"record_id" => @sys_id})
      assert %{"result" => %{"sys_id" => "p1"}} = Jason.decode!(encoded)
    end

    test "get_change_conflicts reads the latest result" do
      expect(Req, :request, fn opts ->
        assert opts[:method] == :get
        assert opts[:url] == "#{@change}/change/#{@sys_id}/conflict"
        {:ok, %Req.Response{status: 200, body: ~s({"result":{"state":"complete"}})}}
      end)

      assert {:ok, _} = run(Console.AI.Tools.Workbench.Integration.ServiceNow.GetChangeConflicts, %{"record_id" => @sys_id})
    end
  end

  defp run(mod, attrs) do
    {:ok, model} =
      mod
      |> struct(tool: workbench_tool())
      |> mod.changeset(attrs)
      |> Ecto.Changeset.apply_action(:update)

    mod.implement(model)
  end

  defp workbench_tool() do
    %WorkbenchTool{}
    |> WorkbenchTool.changeset(%{
      tool: :service_now,
      name: "snow",
      configuration: %{
        service_now: %{
          url: "https://example.service-now.com",
          username: "agent",
          password: "secret"
        }
      }
    })
    |> Ecto.Changeset.apply_changes()
  end
end
