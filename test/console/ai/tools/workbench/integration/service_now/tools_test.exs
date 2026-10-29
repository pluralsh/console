defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.ToolsTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Tool
  alias Console.AI.Workbench.Tools, as: WorkbenchTools
  alias Console.AI.Workbench.MCP.Toolset.Classify
  alias Console.AI.Tools.Workbench.Integration.ServiceNow.{
    AddComment,
    Client,
    CreateRecord,
    GetRecord,
    GetVariables,
    ListComments,
    ListRecords,
    ListStates,
    Tools,
    UpdateRecord
  }

  alias Console.Schema.WorkbenchTool

  @sys_id "0123456789abcdef0123456789abcdef"
  @base "https://example.service-now.com/api/now"

  test "expands the ticket tools and no destructive ones" do
    names = workbench_tool() |> Tools.expand() |> Enum.map(&Tool.name/1)

    assert Enum.sort(names) ==
             Enum.sort([
               "service_now_snow_list_records",
               "service_now_snow_get_record",
               "service_now_snow_get_variables",
               "service_now_snow_create_record",
               "service_now_snow_update_record",
               "service_now_snow_list_comments",
               "service_now_snow_add_comment",
               "service_now_snow_list_states",
               "service_now_snow_transition_record"
             ])
  end

  test "registers with integration tools and classifies only reads as read-only" do
    tools = WorkbenchTools.integration_tools([workbench_tool()])
    assert length(tools) == 9

    readonly = [ListRecords, GetRecord, GetVariables, ListComments, ListStates]

    for %mod{} = tool <- tools do
      assert Classify.readonly?(tool) == (mod in readonly)
    end
  end

  test "the json schemas offer exactly the tables the client allows" do
    for %mod{} = tool <- Tools.expand(workbench_tool()), mod != GetVariables do
      expected = if mod == CreateRecord, do: Client.creatable_tables(), else: Client.tables()
      assert Enum.sort(mod.json_schema(tool)["properties"]["table"]["enum"]) == Enum.sort(expected)
    end
  end

  test "create_record rejects requests and requested items" do
    for table <- ~w(sc_request sc_req_item) do
      assert {:error, changeset} =
               %CreateRecord{tool: workbench_tool()}
               |> CreateRecord.changeset(%{"table" => table, "short_description" => "Laptop"})
               |> Ecto.Changeset.apply_action(:update)

      assert %{table: [msg]} = errors_on(changeset)
      assert msg =~ "catalog item"
    end
  end

  test "validates tables against the allowlist" do
    assert {:error, changeset} =
             %ListRecords{tool: workbench_tool()}
             |> ListRecords.changeset(%{"table" => "sys_user"})
             |> Ecto.Changeset.apply_action(:update)

    assert %{table: [_]} = errors_on(changeset)
  end

  test "list_records sends an encoded query and returns a next cursor" do
    expect(Req, :request, fn opts ->
      assert opts[:method] == :get
      uri = URI.parse(opts[:url])
      assert "#{uri.scheme}://#{uri.host}#{uri.path}" == "#{@base}/table/incident"

      assert URI.decode_query(uri.query) == %{
               "sysparm_query" => "active=true^priority=1",
               "sysparm_fields" => "number,state",
               "sysparm_limit" => "2",
               "sysparm_offset" => "4",
               "sysparm_display_value" => "true",
               "sysparm_exclude_reference_link" => "true"
             }

      {:ok, %Req.Response{status: 200, body: ~s({"result":[{"number":"INC1"},{"number":"INC2"}]})}}
    end)

    assert {:ok, encoded} =
             run(ListRecords, %{
               "table" => "incident",
               "query" => "active=true^priority=1",
               "fields" => ["number", "state"],
               "limit" => 2,
               "cursor" => "4"
             })

    assert %{"nextCursor" => "6", "result" => [_, _]} = Jason.decode!(encoded)
  end

  test "get_record resolves a number before fetching the record" do
    expect(Req, :request, 2, fn opts ->
      case opts[:url] do
        "#{@base}/table/change_request?" <> _ ->
          {:ok, %Req.Response{status: 200, body: ~s({"result":[{"sys_id":"#{@sys_id}"}]})}}

        "#{@base}/table/change_request/#{@sys_id}?" <> _ ->
          {:ok, %Req.Response{status: 200, body: ~s({"result":{"number":"CHG0030002"}})}}
      end
    end)

    assert {:ok, encoded} = run(GetRecord, %{"table" => "change_request", "record_id" => "CHG0030002"})
    assert %{"result" => %{"number" => "CHG0030002"}} = Jason.decode!(encoded)
  end

  test "create_record posts the summary, description and extra fields" do
    expect(Req, :request, fn opts ->
      assert opts[:method] == :post
      assert opts[:url] =~ "#{@base}/table/problem?"

      assert Jason.decode!(opts[:body]) == %{
               "short_description" => "Disk full",
               "description" => "Root volume at 100%",
               "urgency" => "2"
             }

      {:ok, %Req.Response{status: 201, body: ~s({"result":{"number":"PRB1"}})}}
    end)

    assert {:ok, encoded} =
             run(CreateRecord, %{
               "table" => "problem",
               "short_description" => "Disk full",
               "description" => "Root volume at 100%",
               "fields" => %{"urgency" => "2"}
             })

    assert %{"result" => %{"number" => "PRB1"}} = Jason.decode!(encoded)
  end

  test "update_record patches the record" do
    expect(Req, :request, fn opts ->
      assert opts[:method] == :patch
      assert opts[:url] =~ "#{@base}/table/incident/#{@sys_id}?"
      assert Jason.decode!(opts[:body]) == %{"state" => "6", "close_notes" => "fixed"}
      {:ok, %Req.Response{status: 200, body: ~s({"result":{"state":"6"}})}}
    end)

    assert {:ok, _} =
             run(UpdateRecord, %{
               "table" => "incident",
               "record_id" => @sys_id,
               "fields" => %{"state" => "6", "close_notes" => "fixed"}
             })
  end

  test "update_record requires at least one field" do
    assert {:error, changeset} =
             %UpdateRecord{tool: workbench_tool()}
             |> UpdateRecord.changeset(%{"table" => "incident", "record_id" => @sys_id, "fields" => %{}})
             |> Ecto.Changeset.apply_action(:update)

    assert %{fields: [_]} = errors_on(changeset)
  end

  test "add_comment writes a work note by default" do
    expect(Req, :request, fn opts ->
      assert opts[:method] == :patch
      assert Jason.decode!(opts[:body]) == %{"work_notes" => "Investigating"}
      {:ok, %Req.Response{status: 200, body: ~s({"result":{"sys_id":"#{@sys_id}"}})}}
    end)

    assert {:ok, encoded} =
             run(AddComment, %{"table" => "incident", "record_id" => @sys_id, "body" => "Investigating"})

    assert %{"added" => true, "type" => "work_notes"} = Jason.decode!(encoded)
  end

  test "list_comments reads the journal for the record" do
    expect(Req, :request, fn opts ->
      assert opts[:url] =~ "#{@base}/table/sc_task/#{@sys_id}"
      {:ok, %Req.Response{status: 200, body: ~s({"result":{"sys_id":"#{@sys_id}"}})}}
    end)

    expect(Req, :request, fn opts ->
      uri = URI.parse(opts[:url])
      assert uri.path == "/api/now/table/sys_journal_field"

      assert URI.decode_query(uri.query)["sysparm_query"] ==
               "element_id=#{@sys_id}^elementINcomments,work_notes^ORDERBYDESCsys_created_on"

      {:ok, %Req.Response{status: 200, body: ~s({"result":[{"value":"hi"}]})}}
    end)

    assert {:ok, encoded} = run(ListComments, %{"table" => "sc_task", "record_id" => @sys_id})
    assert %{"result" => [%{"value" => "hi"}], "nextCursor" => nil} = Jason.decode!(encoded)
  end

  test "list_comments rejects a sys_id that is not in the table" do
    expect(Req, :request, fn opts ->
      assert opts[:url] =~ "#{@base}/table/incident/#{@sys_id}"
      {:ok, %Req.Response{status: 404, body: ~s({"error":{"message":"No Record found"}})}}
    end)

    assert {:error, msg} = run(ListComments, %{"table" => "incident", "record_id" => @sys_id})
    assert msg =~ "404"
  end

  test "get_record resolves a requested item number in sc_req_item" do
    expect(Req, :request, 2, fn opts ->
      case opts[:url] do
        "#{@base}/table/sc_req_item?" <> query ->
          assert URI.decode_query(query)["sysparm_query"] == "number=RITM0010001"
          {:ok, %Req.Response{status: 200, body: ~s({"result":[{"sys_id":"#{@sys_id}"}]})}}

        "#{@base}/table/sc_req_item/#{@sys_id}?" <> _ ->
          {:ok, %Req.Response{status: 200, body: ~s({"result":{"number":"RITM0010001","stage":"fulfillment"}})}}
      end
    end)

    assert {:ok, encoded} = run(GetRecord, %{"table" => "sc_req_item", "record_id" => "RITM0010001"})
    assert %{"result" => %{"number" => "RITM0010001"}} = Jason.decode!(encoded)
  end

  describe "get_variables" do
    @variables ~s({"result":[
      {"sc_item_option.item_option_new.name":"workspace","sc_item_option.item_option_new.question_text":"Workspace name",
       "sc_item_option.item_option_new.type":"6","sc_item_option.item_option_new.read_roles":"",
       "sc_item_option.value":"plural-test"},
      {"sc_item_option.item_option_new.name":"optional_label","sc_item_option.item_option_new.question_text":"Optional Software",
       "sc_item_option.item_option_new.type":"11","sc_item_option.item_option_new.read_roles":"",
       "sc_item_option.value":""},
      {"sc_item_option.item_option_new.name":"acrobat","sc_item_option.item_option_new.question_text":"Adobe Acrobat",
       "sc_item_option.item_option_new.type":"7","sc_item_option.item_option_new.read_roles":"",
       "sc_item_option.value":"true"},
      {"sc_item_option.item_option_new.name":"api_key","sc_item_option.item_option_new.question_text":"API key",
       "sc_item_option.item_option_new.type":"25","sc_item_option.item_option_new.read_roles":"",
       "sc_item_option.value":"encrypted"},
      {"sc_item_option.item_option_new.name":"cost_center","sc_item_option.item_option_new.question_text":"Cost center",
       "sc_item_option.item_option_new.type":"6","sc_item_option.item_option_new.read_roles":"finance",
       "sc_item_option.value":"CC-42"},
      {"sc_item_option.item_option_new.name":"no_roles_field","sc_item_option.item_option_new.question_text":"Unknown roles",
       "sc_item_option.item_option_new.type":"6","sc_item_option.value":"secret?"},
      {"sc_item_option.item_option_new.read_roles":"","sc_item_option.value":"unknown type"}
    ]})

    test "reads the variables of a requested item, without layout variables or hidden values" do
      expect(Req, :request, fn opts ->
        assert opts[:url] =~ "#{@base}/table/sc_req_item/#{@sys_id}?"
        {:ok, %Req.Response{status: 200, body: ~s({"result":{"sys_id":"#{@sys_id}"}})}}
      end)

      expect(Req, :request, fn opts ->
        uri = URI.parse(opts[:url])
        assert uri.path == "/api/now/table/sc_item_option_mtom"

        query = URI.decode_query(uri.query)
        assert query["sysparm_query"] == "request_item=#{@sys_id}^ORDERBYsc_item_option.order"
        assert query["sysparm_fields"] =~ "sc_item_option.item_option_new.name"
        assert query["sysparm_fields"] =~ "sc_item_option.item_option_new.read_roles"
        assert query["sysparm_fields"] =~ "sc_item_option.value"

        {:ok, %Req.Response{status: 200, body: @variables}}
      end)

      assert {:ok, encoded} = run(GetVariables, %{"record_id" => @sys_id})

      assert Jason.decode!(encoded) == %{
               "table" => "sc_req_item",
               "sysId" => @sys_id,
               "requestItem" => @sys_id,
               "variables" => [
                 %{"name" => "workspace", "question" => "Workspace name", "value" => "plural-test"},
                 %{"name" => "acrobat", "question" => "Adobe Acrobat", "value" => "true"},
                 %{"name" => "api_key", "question" => "API key", "value" => "(masked)"},
                 %{"name" => "cost_center", "question" => "Cost center", "value" => "(restricted)"},
                 %{"name" => "no_roles_field", "question" => "Unknown roles", "value" => "(hidden)"},
                 %{"name" => nil, "question" => nil, "value" => "(hidden)"}
               ],
               "truncated" => false
             }
    end

    test "flags a full page as truncated" do
      expect(Req, :request, fn _ ->
        {:ok, %Req.Response{status: 200, body: ~s({"result":{"sys_id":"#{@sys_id}"}})}}
      end)

      rows =
        for i <- 1..200,
            do: %{
              "sc_item_option.item_option_new.name" => "v#{i}",
              "sc_item_option.item_option_new.type" => "6",
              "sc_item_option.item_option_new.read_roles" => ""
            }

      expect(Req, :request, fn _ ->
        {:ok, %Req.Response{status: 200, body: Jason.encode!(%{"result" => rows})}}
      end)

      assert {:ok, encoded} = run(GetVariables, %{"record_id" => @sys_id})
      assert %{"truncated" => true, "variables" => variables} = Jason.decode!(encoded)
      assert length(variables) == 200
    end

    test "fails for a sys_id that is not a requested item" do
      expect(Req, :request, fn opts ->
        assert opts[:url] =~ "#{@base}/table/sc_req_item/#{@sys_id}?"
        {:ok, %Req.Response{status: 404, body: ~s({"error":{"message":"No Record found"}})}}
      end)

      assert {:error, msg} = run(GetVariables, %{"record_id" => @sys_id})
      assert msg =~ "404"
    end

    test "reads the variables of the requested item of a catalog task" do
      item = "fedcba9876543210fedcba9876543210"

      expect(Req, :request, fn opts ->
        assert opts[:url] =~ "#{@base}/table/sc_task/#{@sys_id}?"
        {:ok, %Req.Response{status: 200, body: ~s({"result":{"request_item":"#{item}"}})}}
      end)

      expect(Req, :request, fn opts ->
        assert URI.decode_query(URI.parse(opts[:url]).query)["sysparm_query"] =~ "request_item=#{item}^"
        {:ok, %Req.Response{status: 200, body: ~s({"result":[]})}}
      end)

      assert {:ok, encoded} = run(GetVariables, %{"table" => "sc_task", "record_id" => @sys_id})
      assert %{"requestItem" => ^item, "variables" => []} = Jason.decode!(encoded)
    end

    test "fails for a catalog task without a requested item" do
      expect(Req, :request, fn _ ->
        {:ok, %Req.Response{status: 200, body: ~s({"result":{"request_item":""}})}}
      end)

      assert {:error, msg} = run(GetVariables, %{"table" => "sc_task", "record_id" => @sys_id})
      assert msg =~ "not attached to a requested item"
    end

    test "rejects requests and other tables" do
      for table <- ~w(sc_request incident) do
        assert {:error, changeset} =
                 %GetVariables{tool: workbench_tool()}
                 |> GetVariables.changeset(%{"table" => table, "record_id" => @sys_id})
                 |> Ecto.Changeset.apply_action(:update)

        assert %{table: [msg]} = errors_on(changeset)
        assert msg =~ "list_records"
      end
    end

    test "only offers tables the client allows" do
      tool = %GetVariables{tool: workbench_tool()}
      assert GetVariables.json_schema(tool)["properties"]["table"]["enum"] -- Client.tables() == []
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
