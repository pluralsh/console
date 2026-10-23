defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.StateToolsTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Tools.Workbench.Integration.ServiceNow.{ListStates, TransitionRecord}
  alias Console.Schema.WorkbenchTool

  @sys_id "0123456789abcdef0123456789abcdef"
  @table "https://example.service-now.com/api/now"
  @change "https://example.service-now.com/api/sn_chg_rest/v1"

  @next_states ~s({"result":{
    "available_states":["-5","-4"],
    "state_label":{"-5":"New","-4":"Assess"},
    "state_transitions":[[{"from_state":"-5","to_state":"-4","transition_available":true}]]
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

    test "lists the choices of another field, such as the resolution code" do
      expect(Req, :request, fn opts ->
        query = URI.decode_query(URI.parse(opts[:url]).query)
        assert query["sysparm_query"] =~ "name=incident^element=close_code^inactive=false^language=en"

        {:ok,
         %Req.Response{
           status: 200,
           body: ~s({"result":[{"value":"Solution provided","label":"Solution provided"},{"value":"Duplicate","label":"Duplicate"}]})
         }}
      end)

      assert {:ok, encoded} = run(ListStates, %{"table" => "incident", "field" => "close_code"})

      assert %{"field" => "close_code", "choices" => [%{"value" => "Solution provided"}, %{"value" => "Duplicate"}]} =
               Jason.decode!(encoded)
    end

    test "falls back to the task choices for another field too" do
      expect(Req, :request, fn opts ->
        assert URI.decode_query(URI.parse(opts[:url]).query)["sysparm_query"] =~ "name=sc_task^element=priority^"
        {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}}
      end)

      expect(Req, :request, fn opts ->
        assert URI.decode_query(URI.parse(opts[:url]).query)["sysparm_query"] =~ "name=task^element=priority^"
        {:ok, %Req.Response{status: 200, body: ~s({"result":[{"value":"1","label":"1 - Critical"}]})}}
      end)

      assert {:ok, encoded} = run(ListStates, %{"table" => "sc_task", "field" => "priority"})
      assert %{"choices" => [%{"value" => "1"}]} = Jason.decode!(encoded)
    end

    test "field state answers like a call without a field" do
      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: @choices}} end)

      assert {:ok, encoded} = run(ListStates, %{"table" => "incident", "field" => "state"})
      assert %{"states" => [_, _, _]} = Jason.decode!(encoded)
    end

    test "field state on a change with a record reads the next states" do
      expect(Req, :request, fn opts ->
        assert opts[:url] == "#{@change}/change/#{@sys_id}/nextstates"
        {:ok, %Req.Response{status: 200, body: @next_states}}
      end)

      assert {:ok, encoded} =
               run(ListStates, %{"table" => "change_request", "record_id" => @sys_id, "field" => "state"})

      assert %{"nextStates" => _} = Jason.decode!(encoded)
    end

    test "rejects a field that is not a plain column name" do
      reject(&Req.request/1)

      assert {:error, msg} = run(ListStates, %{"table" => "incident", "field" => "state^ORactive=true"})
      assert msg =~ "plain column name"
    end

    test "reads the choices of a field for a change when asked for one" do
      expect(Req, :request, fn opts ->
        assert URI.parse(opts[:url]).path == "/api/now/table/sys_choice"
        assert URI.decode_query(URI.parse(opts[:url]).query)["sysparm_query"] =~ "name=change_request^element=close_code^"
        {:ok, %Req.Response{status: 200, body: ~s({"result":[{"value":"successful","label":"Successful"}]})}}
      end)

      assert {:ok, encoded} =
               run(ListStates, %{"table" => "change_request", "record_id" => @sys_id, "field" => "close_code"})

      assert %{"field" => "close_code", "choices" => [%{"value" => "successful"}]} = Jason.decode!(encoded)
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
                 "close_code" => "Solution provided",
                 "close_notes" => "fixed"
               }

        {:ok, %Req.Response{status: 200, body: ~s({"result":{"state":"6"}})}}
      end)

      assert {:ok, encoded} =
               run(TransitionRecord, %{
                 "table" => "incident",
                 "record_id" => @sys_id,
                 "state" => "resolved",
                 "fields" => %{"close_code" => "Solution provided", "close_notes" => "fixed"}
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

    test "names the unmet conditions of a blocked transition" do
      expect(Req, :request, 2, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)

      expect(Req, :request, fn _ ->
        body = ~s({"result":{
          "available_states":["-4","4","-5"],
          "state_label":{"-4":"Assess","4":{"display_value":"Canceled"},"-5":"New"},
          "state_transitions":[
            [{"sys_id":"c05d","display_value":"New to Assess","from_state":"-5","to_state":"-4","transition_available":false,
              "automatic_transition":false,
              "conditions":[{"passed":false,"condition":{"name":"Assignment group is not empty","sys_id":"ef4e"}}]}],
            [{"sys_id":"5d17","display_value":"New to Canceled","from_state":"-5","to_state":"4","transition_available":true,
              "automatic_transition":false,"conditions":[]}]
          ]
        }})

        {:ok, %Req.Response{status: 200, body: body}}
      end)

      assert {:error, msg} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "assess"})
      assert msg =~ "unmet conditions: Assignment group is not empty"
      assert msg =~ "Available states: 4 (Canceled)."
    end

    test "refuses the current state and unknown states when transitions are reported" do
      for state <- ["new", "banana"] do
        expect(Req, :request, fn _ ->
          {:ok, %Req.Response{status: 200, body: ~s({"result":[{"value":"-5","label":"New"},{"value":"-4","label":"Assess"}]})}}
        end)

        expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: @next_states}} end)

        assert {:error, msg} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => state})
        assert msg =~ "Available states: -4 (Assess)."
      end
    end

    test "takes a state that has both an open and a blocked transition, and merges string booleans" do
      body = ~s({"result":{"state_label":{"-4":"Assess"},"state_transitions":[
        [{"to_state":"-4","transition_available":"false","conditions":[{"passed":"false","condition":{"name":"Group set"}}]}],
        [{"to_state":"-4","transition_available":true,"conditions":[]}]
      ]}})

      expect(Req, :request, 2, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)
      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: body}} end)

      expect(Req, :request, fn opts ->
        assert Jason.decode!(opts[:body]) == %{"state" => "-4"}
        {:ok, %Req.Response{status: 200, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "assess"})
    end

    test "merges the conditions of several blocked transitions to one state" do
      body = ~s({"result":{"state_transitions":[
        [{"to_state":"-4","transition_available":"false","conditions":[{"passed":"false","condition":{"name":"Group set"}}]}],
        [{"to_state":"-4","transition_available":false,"conditions":[{"passed":false,"condition":{"name":"Plan set"}},{"passed":true,"condition":{"name":"Fine"}}]}],
        [{"to_state":"4","transition_available":true}]
      ]}})

      expect(Req, :request, 2, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)
      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: body}} end)

      assert {:error, msg} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "-4"})
      assert msg =~ "unmet conditions: Group set, Plan set"
      refute msg =~ "Fine"
    end

    test "uses available_states when no transition has a readable target" do
      body = ~s({"result":{"available_states":["-5","-4"],"state_transitions":[[{"to_state":""}]]}})

      expect(Req, :request, 2, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)
      expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: body}} end)

      expect(Req, :request, fn opts ->
        assert Jason.decode!(opts[:body]) == %{"state" => "-5"}
        {:ok, %Req.Response{status: 200, body: ~s({"result":{}})}}
      end)

      assert {:ok, _} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "-5"})
    end

    test "refuses when every reported transition is blocked" do
      expect(Req, :request, 2, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)

      expect(Req, :request, fn _ ->
        body = ~s({"result":{
          "available_states":["-5"],
          "state_label":{"-5":"New","-2":"Scheduled"},
          "state_transitions":[[{"from_state":"-5","to_state":"-2","transition_available":false}]]
        }})

        {:ok, %Req.Response{status: 200, body: body}}
      end)

      assert {:error, msg} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => "-2"})
      assert msg =~ "its conditions are not met"
      assert msg =~ "No other state can be reached right now."
    end

    test "reads a flat list of transitions and falls back to available_states when there are none" do
      for {body, state} <- [
            {~s({"result":{"available_states":["-5","-4"],"state_transitions":[{"to_state":"-4","transition_available":true}]}}), "-4"},
            {~s({"result":{"available_states":["-5","-4"],"state_transitions":[]}}), "-4"}
          ] do
        expect(Req, :request, 2, fn _ -> {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}} end)
        expect(Req, :request, fn _ -> {:ok, %Req.Response{status: 200, body: body}} end)

        expect(Req, :request, fn opts ->
          assert Jason.decode!(opts[:body]) == %{"state" => state}
          {:ok, %Req.Response{status: 200, body: ~s({"result":{}})}}
        end)

        assert {:ok, _} = run(TransitionRecord, %{"table" => "change_request", "record_id" => @sys_id, "state" => state})
      end
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
