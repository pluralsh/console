defmodule Console.AI.Tools.Workbench.Integration.Teams.Reply do
  @moduledoc """
  Replies to the Teams conversation that triggered this workbench chatbot job, via the Bot Framework connector.

  Reply coordinates (`serviceUrl`/`conversationId`) are read from the job's persisted `ChatbotMessage`, so the
  agent only needs to supply the response `text` - it does not need channel or message ids.  This is the correct
  way to respond to a mention; application-only Microsoft Graph posting is not available for standard channels.
  """
  use Console.AI.Tools.Workbench.Base
  alias Console.Schema.{WorkbenchTool, WorkbenchJob, ChatbotMessage}
  alias Console.Schema.WorkbenchTool.{Configuration, Configuration.TeamsConnection}
  alias Console.Chat.Teams.Connector

  embedded_schema do
    field :tool, :map, virtual: true
    field :text, :string
  end

  @json_schema Console.priv_file!("tools/workbench/integration/teams/reply.json") |> Jason.decode!()

  def name(%__MODULE__{tool: %WorkbenchTool{name: name}}), do: "teams_reply_#{name}"

  def description(%__MODULE__{tool: %WorkbenchTool{name: name}}),
    do:
      "Reply in the Teams conversation that triggered this job for #{name}. Posts `text` as a threaded reply to the original mention via the Bot Framework connector. Use this to respond to the user - you do not need channel or message ids."

  def json_schema(%__MODULE__{}), do: @json_schema

  def changeset(%__MODULE__{} = model, attrs) do
    model
    |> cast(attrs, [:text])
    |> validate_required([:text])
  end

  def implement(%__MODULE__{tool: %WorkbenchTool{configuration: %Configuration{teams: %TeamsConnection{} = conn}}, text: text}) do
    with %ChatbotMessage{service_url: url, conversation_id: cid} when is_binary(url) and is_binary(cid) <- reply_context(),
         {:ok, resp} <- Connector.reply(conn, url, cid, text) do
      Jason.encode(resp)
    else
      {:error, _} = err -> err
      _ -> {:error, "no teams chat context is available for this job; use teams_post_channel_message with explicit ids instead"}
    end
  end
  def implement(%__MODULE__{}), do: {:error, "Microsoft Teams app registration is not configured for this workbench tool."}

  defp reply_context() do
    case Console.AI.Tool.context() do
      %Console.AI.Tool.Context{job: %WorkbenchJob{chatbot_message: %ChatbotMessage{} = msg}} -> msg
      _ -> nil
    end
  end
end
