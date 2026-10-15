defmodule Console.AI.Tools.Workbench.Integration.ServiceNow.ToolsTest do
  use Console.DataCase, async: false
  use Mimic

  alias Console.AI.Tool
  alias Console.AI.Workbench.Tools, as: WorkbenchTools
  alias Console.AI.Workbench.MCP.Toolset.Classify
  alias Console.AI.Tools.Workbench.Integration.ServiceNow.{
    AddComment,
    CreateRecord,
    DeleteRecord,
    GetRecord,
    ListComments,
    ListRecords,
    Tools,
    UpdateRecord
  }

  alias Console.Schema.WorkbenchTool

  @sys_id "0123456789abcdef0123456789abcdef"
  @base "https://example.service-now.com/api/now"

  test "expands delete only when it is enabled" do
    names = workbench_tool() |> Tools.expand() |> Enum.map(&Tool.name/1)

    assert Enum.sort(names) ==
             Enum.sort([
               "service_now_snow_list_records",
               "service_now_snow_get_record",
               "service_now_snow_create_record",
               "service_now_snow_update_record",
               "service_now_snow_list_comments",
               "service_now_snow_add_comment"
             ])

    names = workbench_tool(allow_delete: true) |> Tools.expand() |> Enum.map(&Tool.name/1)
    assert "service_now_snow_delete_record" in names
  end

  test "registers with integration tools and classifies only reads as read-only" do
    tools = WorkbenchTools.integration_tools([workbench_tool(allow_delete: true)])
    assert length(tools) == 7

    for %mod{} = tool <- tools do
      assert Classify.readonly?(tool) == (mod in [ListRecords, GetRecord, ListComments])
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

  test "delete_record deletes when enabled" do
    expect(Req, :request, fn opts ->
      assert opts[:method] == :delete
      assert opts[:url] == "#{@base}/table/incident/#{@sys_id}"
      {:ok, %Req.Response{status: 204, body: ""}}
    end)

    assert {:ok, encoded} =
             run(DeleteRecord, %{"table" => "incident", "record_id" => @sys_id}, allow_delete: true)

    assert %{"deleted" => true, "sysId" => @sys_id} = Jason.decode!(encoded)
  end

  test "delete_record refuses when delete is disabled" do
    reject(&Req.request/1)
    assert {:error, _} = run(DeleteRecord, %{"table" => "incident", "record_id" => @sys_id})
  end

  defp run(mod, attrs, opts \\ []) do
    {:ok, model} =
      mod
      |> struct(tool: workbench_tool(opts))
      |> mod.changeset(attrs)
      |> Ecto.Changeset.apply_action(:update)

    mod.implement(model)
  end

  defp workbench_tool(opts \\ []) do
    %WorkbenchTool{}
    |> WorkbenchTool.changeset(%{
      tool: :service_now,
      name: "snow",
      configuration: %{
        service_now: %{
          url: "https://example.service-now.com",
          username: "agent",
          password: "secret",
          allow_delete: Keyword.get(opts, :allow_delete, false)
        }
      }
    })
    |> Ecto.Changeset.apply_changes()
  end
end
