defmodule Console.AI.Tools.Workbench.FunctionCallTest do
  use Console.DataCase, async: false
  use Mimic

  alias CloudQuery.Client
  alias Console.AI.Tool
  alias Console.AI.Tools.Workbench.FunctionCall
  alias Console.Schema.WorkbenchJobActivity
  alias Toolquery.{InvokeLambdaInput, InvokeLambdaOutput}
  alias Toolquery.ToolQuery.Stub

  describe "changeset/2" do
    test "validates input against the configured function input schema" do
      tool = insert(:workbench_function_tool)

      assert {:ok, %FunctionCall{input: %{"deployment" => "api", "replicas" => 2}, explanation: explanation}} =
               %FunctionCall{tool: tool}
               |> FunctionCall.changeset(%{
                 "input" => %{"deployment" => "api", "replicas" => 2},
                 "explanation" => "Scale the api deployment to handle increased traffic."
               })
               |> Ecto.Changeset.apply_action(:update)

      assert explanation == "Scale the api deployment to handle increased traffic."

      {:error, changeset} =
        %FunctionCall{tool: tool}
        |> FunctionCall.changeset(%{"input" => %{"deployment" => "api", "replicas" => 2}})
        |> Ecto.Changeset.apply_action(:update)

      assert "can't be blank" in errors_on(changeset).explanation

      {:error, changeset} =
        %FunctionCall{tool: tool}
        |> FunctionCall.changeset(%{"input" => %{"deployment" => 1}, "explanation" => "Update the deployment."})
        |> Ecto.Changeset.apply_action(:update)

      assert [error] = errors_on(changeset).input
      assert error =~ "is not a valid input"
      assert error =~ "deployment"
    end
  end

  describe "invoke/1" do
    test "creates an approval activity and skips grpc invocation when approval is required" do
      reject(&Client.connect/0)
      reject(&Stub.invoke_lambda/3)

      %{job: job, tool: tool} = function_fixture(approval: true)
      input = %{"deployment" => "api"}
      explanation = "Scale the api deployment to handle increased traffic."

      assert {:ok, %WorkbenchJobActivity{status: :needs_approval, type: :function} = activity} =
               FunctionCall.invoke(%FunctionCall{tool: tool, job: job, input: input, explanation: explanation})

      assert activity.prompt == "function call: #{tool.name}"
      assert activity.result.output == "waiting for user approval"
      assert activity.result.explanation == explanation
      assert activity.result.function_call.name == tool.name
      assert activity.result.function_call.tool_id == tool.id
      assert activity.result.function_call.input == input
    end

    test "propagates policy approval to the function activity" do
      reject(&Client.connect/0)
      reject(&Stub.invoke_lambda/3)

      %{job: job, tool: tool} = function_fixture(approval: true)
      approval = %Tool.Approval{reason: "approved by policy"}

      assert {:ok, %WorkbenchJobActivity{status: :needs_approval, type: :function} = activity} =
               FunctionCall.invoke(%FunctionCall{
                 tool: tool,
                 job: job,
                 input: %{"deployment" => "api"},
                 explanation: "Scale the api deployment.",
                 approval: approval
               })

      assert activity.result.auto_approve
      assert activity.result.approval_reason == "approved by policy"
    end

    test "invokes grpc immediately when approval is not required" do
      %{job: job, tool: tool} = function_fixture()
      input = %{"deployment" => "api"}
      explanation = "Scale the api deployment to handle increased traffic."

      expect(Client, :connect, fn -> {:ok, :mock_conn} end)

      expect(Stub, :invoke_lambda, fn :mock_conn, %InvokeLambdaInput{} = request, opts ->
        assert request.identifier == "arn:aws:lambda:us-east-1:123456789012:function:plural-workbench-tool"
        assert Jason.decode!(request.payload_json) == input
        assert opts == Client.lambda_rpc_opts()

        {:ok, %InvokeLambdaOutput{result: "complete"}}
      end)

      assert {:ok, %WorkbenchJobActivity{status: :successful, type: :function} = activity} =
               FunctionCall.invoke(%FunctionCall{tool: tool, job: job, input: input, explanation: explanation})

      assert activity.prompt == "function call: #{tool.name}"
      assert activity.result.function_call.name == tool.name
      assert activity.result.function_call.tool_id == tool.id
      assert activity.result.function_call.input == input
      assert activity.result.explanation == explanation

      assert {:ok, output} = Jason.decode(activity.result.output)
      assert output["result"] == "complete"
    end

    test "invokes http tools directly without grpc" do
      reject(&Client.connect/0)
      reject(&Stub.invoke_lambda/3)

      project = insert(:project)
      workbench = insert(:workbench, project: project)
      job = insert(:workbench_job, workbench: workbench, status: :running)

      tool =
        insert(:workbench_tool,
          project: project,
          tool: :http,
          categories: [:function],
          name: "example_http_function",
          configuration: %{
            http: %{
              url: "https://example.com",
              method: :get,
              function: true,
              input_schema: %{"type" => "object", "properties" => %{}, "required" => []}
            }
          }
        )

      expect(Req, :request, fn opts ->
        assert opts[:method] == :get
        assert opts[:url] == "https://example.com"
        {:ok, %Req.Response{status: 200, body: "<!doctype html><html><body><h1>Example Domain</h1></body></html>"}}
      end)

      assert {:ok, %WorkbenchJobActivity{status: :successful, type: :function} = activity} =
               FunctionCall.invoke(%FunctionCall{
                 tool: tool,
                 job: job,
                 input: %{},
                 explanation: "Verify that the HTTP function is reachable."
               })

      assert activity.result.function_call.name == tool.name
      assert activity.result.function_call.tool_id == tool.id
      assert activity.result.function_call.input == %{}
      assert activity.result.explanation == "Verify that the HTTP function is reachable."
      assert activity.result.output =~ "http response:"
      assert activity.result.output =~ "Example Domain"
      assert activity.result.output =~ "(status 200)"
    end
  end

  defp function_fixture(attrs \\ []) do
    project = insert(:project)
    workbench = insert(:workbench, project: project)
    job = insert(:workbench_job, workbench: workbench, status: :running)
    tool = insert(:workbench_function_tool, Keyword.put_new(attrs, :project, project))

    %{job: job, tool: tool}
  end
end
