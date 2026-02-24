defmodule Console.Deployments.Pr.Governance.Impl.ServiceNow do
  @moduledoc """
  Implements the PR governance controller hooks to implement a ServiceNow <> SCM sync during a pr lifecycle.

  The overall flow is:

  1. pr create -> service now change created
  2. service now change approved -> pr approved and change moved to implement state
  3. pr merge -> service now change closed with success (moving all intermediate states)
  4. pr close -> service now change cancelled

  We also write a PR comment to record the changes in ServiceNow and make it easier to track the generated change.
  """
  @behaviour Console.Deployments.Pr.Governance.Provider
  alias Console.Repo
  alias Console.Schema.{PrGovernance, PullRequest}
  alias Console.Deployments.Pr.Dispatcher
  alias Console.ServiceNow.{Client, Change}
  alias Console.AI.{Provider, Tools.ServiceNow}
  require EEx
  require Logger

  def open(%PrGovernance{} = gov, pr) do
    client = snow(gov)
    model = change_model(gov)

    with {:ok, attributes} <- change_attributes(gov, pr),
         {:ok, %Change{sys_id: sys_id, number: number} = change} <- Client.create_change(client, attributes, chg_model: model) do
      state = %{"id" => sys_id, "state" => floor(change.state), "number" => number}
      github_comment({:ok, change}, gov, pr, state["state"], state)
    end
  end

  def close(%PrGovernance{} = gov, %PullRequest{status: :merged, governance_state: %{"id" => sys_id, "state" => state} = prev} = pr) do
    client = snow(gov)
    walk_close(client, sys_id, state, 3)
    |> github_comment(gov, pr, 3, Map.merge(prev, %{"state" => 3}))
  end
  def close(%PrGovernance{} = gov, %PullRequest{status: :closed, governance_state: %{"id" => sys_id} = prev} = pr) do
    client = snow(gov)
    Client.update_change(client, sys_id, %{state: 4})
    |> github_comment(gov, pr, 4, Map.merge(prev, %{"state" => 4}))
  end
  def close(_, _), do: {:error, :not_implemented}

  def confirm(%PrGovernance{} = gov, %PullRequest{governance_state: %{"id" => sys_id} = state} = pr) do
    client = snow(gov)

    case Client.get_change(client, sys_id) do
      {:ok, %Change{state: s, sys_id: sys_id}} when s > -3 and s != 4 ->
        walk_close(client, sys_id, round(s), -1)
        |> github_comment(gov, pr, max(round(s), -1), Map.merge(state, %{"id" => sys_id, "state" => max(round(s), -1)}))
      {:error, _} -> {:error, :not_approved}
    end
  end
  def confirm(_, _), do: {:error, :not_implemented}

  defp github_comment({:ok, _}, %PrGovernance{} = gov, %PullRequest{} = pr, state, %{"number" => number} = prev) do
    %{connection: conn} = Repo.preload(gov, :connection)
    case Dispatcher.review(conn, %{pr | comment_id: prev["comment_id"]}, pr_message(
      approval_emoji: approval_emoji(state),
      url: snow_change_url(gov, number),
      state: state_name(state),
      pending: state <= -3
    )) do
      {:ok, id} -> {:ok, Map.merge(prev, %{"comment_id" => id, "state" => state})}
      _ -> {:ok, Map.put(prev, "state", state)}
    end
  end

  defp github_comment(err, _, _, _, _) do
    Logger.error("Failed to sync servicenow governance state: #{inspect(err)}")
    err
  end

  defp snow(%PrGovernance{configuration: %{service_now: %{url: url, username: username, password: password}}}) do
    Client.new(url, username, password)
  end

  defp walk_close(client, id, current_state, target_state) when current_state < target_state do
    with {next_state, attributes} when is_integer(next_state) and is_map(attributes) <- state_transition(current_state),
         {:ok, _} <- Console.Retrier.retry(fn ->
                       Client.update_change(client, id, Map.put(attributes, :state, next_state)) end,
                     pause: 50, max: 2) do
      :timer.sleep(200) # give snow it a moment to update
      walk_close(client, id, next_state, target_state)
    end
  end
  defp walk_close(_, _, current_state, _), do: {:ok, %{state: current_state}}

  # this is obviously retarded, but that's because it's ServiceNow's fault
  defp state_transition(-3), do: {-2, %{}}
  defp state_transition(-2), do: {-1, %{}}
  defp state_transition(-1), do: {0, %{}}
  defp state_transition(0), do: {3, %{close_code: "successful", close_notes: "Pull request merged"}}
  defp state_transition(_), do: {:error, :invalid_state}

  @required ~w(short_description description implementation_plan backout_plan test_plan)

  defp change_attributes(%PrGovernance{configuration: %{service_now: %{attributes: %{} = attributes}}}, pr) do
    case Enum.all?(@required, &Map.has_key?(attributes, &1)) do
      true -> {:ok, attributes}
      false -> ai_attributes(attributes, pr)
    end
  end
  defp change_attributes(_, pr), do: ai_attributes(%{}, pr)

  @preface """
  You are a devops engineer recording a change you're making to a Github/Gitlab/Bitbucket pull request and translating it into ServiceNow.

  You need to provide all the necessary form attributes, and from there the ServiceNow change will be created for you automatically, be sure
  to be thorough and provide whatever is necessary from an auditing perspective.

  For things like test plan, you can usually say testing performed prior if not elucidated, since this is typically a gitops change.

  For backout plan, if no plan is specified, you can simply say revert the PR.

  Be sure to also provide links and details about the PR to the change information.
  """

  defp ai_attributes(attributes, %PullRequest{} =pr) do
    [{:user, snow_prompt(pr: pr, attributes: attributes)}]
    |> Provider.simple_tool_call(ServiceNow, preface: @preface)
    |> case do
      {:ok, %ServiceNow{} = now} ->
        Console.mapify(now)
        |> Console.string_map()
        |> then(&{:ok, Map.merge(attributes, &1)})
      {:error, error} -> {:error, error}
    end
  end

  defp snow_change_url(%PrGovernance{configuration: %{service_now: %{url: url}}}, number),
    do: "#{url}/change_request.do?sysparm_query=number=#{number}"
  defp snow_change_url(_, _), do: nil

  defp state_name(-5), do: "New"
  defp state_name(-4), do: "Assess"
  defp state_name(-3), do: "Authorize"
  defp state_name(-2), do: "Scheduled"
  defp state_name(-1), do: "Implement"
  defp state_name(0), do: "Review"
  defp state_name(3), do: "Closed"
  defp state_name(4), do: "Cancelled"
  defp state_name(_), do: "Unknown"

  defp approval_emoji(s) when s > -3 and s != 4, do: "👍"
  defp approval_emoji(s) when s <= -3, do: "⏳"
  defp approval_emoji(_), do: "❌"

  defp change_model(%PrGovernance{configuration: %{service_now: %{change_model: model}}}),
    do: model
  defp change_model(_), do: "Standard"

  EEx.function_from_file(:defp, :snow_prompt, Path.join([:code.priv_dir(:console), "prompts", "governance", "snow.md.eex"]), [:assigns])
  EEx.function_from_file(:defp, :pr_message, Path.join([:code.priv_dir(:console), "pr", "governance.md.eex"]), [:assigns])
end
