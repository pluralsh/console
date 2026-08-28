defmodule Console.GraphQl.Resolvers.Deployments.Workbench do
  use Console.GraphQl.Resolvers.Deployments.Base
  import Absinthe.Resolution.Helpers, only: [batch: 3]
  alias Console.Repo
  alias Kube.Utils, as: KUtils
  alias Console.Deployments.{Clusters, Workbenches}
  alias Console.AI.Workbench.{Toolchain, Skills}
  alias Console.AI.Tools.Workbench.Infrastructure.KubeGet
  alias Console.Schema.{
    Alert,
    Cluster,
    Issue,
    Workbench,
    WorkbenchJob,
    WorkbenchJobActivity,
    WorkbenchTool,
    WorkbenchPolicy,
    WorkbenchCron,
    WorkbenchPrompt,
    QueuedPrompt,
    WorkbenchSkill,
    WorkbenchKnowledge,
    WorkbenchEvalResult,
    WorkbenchWebhook,
    WorkbenchChatbot,
    PullRequest
  }

  def workbench(%{id: id}, ctx) when is_binary(id) do
    Workbenches.get_workbench!(id)
    |> allow(actor(ctx), :read)
  end
  def workbench(%{name: name}, ctx) when is_binary(name) do
    Workbenches.get_workbench_by_name!(name)
    |> allow(actor(ctx), :read)
  end
  def workbench(_, _), do: {:error, "Must specify either id or name"}

  def workbench_tool(%{id: id}, ctx) when is_binary(id) do
    Workbenches.get_workbench_tool!(id)
    |> allow(actor(ctx), :read)
  end
  def workbench_tool(%{name: name}, ctx) when is_binary(name) do
    Workbenches.get_workbench_tool_by_name!(name)
    |> allow(actor(ctx), :read)
  end
  def workbench_tool(_, _), do: {:error, "Must specify either id or name"}

  def workbench_chatbot(%{id: id}, ctx) when is_binary(id) do
    Workbenches.get_workbench_chatbot!(id)
    |> allow(actor(ctx), :read)
  end

  def workbench_job(%{id: id}, ctx) do
    Workbenches.get_workbench_job!(id)
    |> allow(actor(ctx), :read)
  end

  def workbench_job_activity(%{id: id}, ctx) do
    Workbenches.get_workbench_job_activity!(id)
    |> allow(actor(ctx), :read)
  end

  @default_recent_workbench_jobs 3
  @max_recent_workbench_jobs 20

  def list_workbench_runs(workbench, args, _) do
    WorkbenchJob.for_workbench(workbench.id)
    |> workbench_job_filters(args)
    |> WorkbenchJob.ordered()
    |> paginate(args)
  end

  def accessible_users(workbench, _args, _) do
    {:ok, Workbenches.accessible_users(workbench)}
  end

  def recent_workbench_jobs(args, %{context: %{current_user: user}}) do
    case Map.get(args, :count, @default_recent_workbench_jobs) do
      count when count < 1 ->
        {:error, "count must be at least 1"}
      count when count > @max_recent_workbench_jobs ->
        {:error, "count must be at most #{@max_recent_workbench_jobs}"}
      count ->
        WorkbenchJob.for_user(user)
        |> WorkbenchJob.ordered()
        |> WorkbenchJob.with_limit(count)
        |> Console.Repo.all()
        |> ok()
    end
  end

  def workbench_job_search(%{q: q, workbench_id: workbench_id} = args, ctx) do
    with {:ok, _} <- Workbenches.get_workbench!(workbench_id) |> allow(actor(ctx), :read) do
      Workbenches.workbench_job_search(q, actor(ctx),
        limit: Map.get(args, :limit, 5),
        workbench_id: workbench_id
      )
    end
  end

  def list_workbench_jobs_for_flow(%{id: flow_id}, args, _) do
    WorkbenchJob.for_flow(flow_id)
    |> workbench_job_filters(args)
    |> WorkbenchJob.ordered()
    |> paginate(args)
  end

  def list_workbench_crons(workbench, args, _) do
    WorkbenchCron.for_workbench(workbench.id)
    |> WorkbenchCron.ordered()
    |> paginate(args)
  end

  def list_workbench_prompts(workbench, args, _) do
    WorkbenchPrompt.for_workbench(workbench.id)
    |> WorkbenchPrompt.ordered()
    |> paginate(args)
  end

  def list_workbench_skills(workbench, args, _) do
    WorkbenchSkill.for_workbench(workbench.id)
    |> WorkbenchSkill.ordered()
    |> paginate(args)
  end

  def list_workbench_knowledge(workbench, args, _) do
    WorkbenchKnowledge.for_workbench(workbench.id)
    |> WorkbenchKnowledge.ordered()
    |> paginate(args)
  end

  def list_workbench_policies(workbench, args, _) do
    WorkbenchPolicy.for_workbench(workbench.id)
    |> paginate(args)
  end

  def list_workbench_webhooks(workbench, args, _) do
    WorkbenchWebhook.for_workbench(workbench.id)
    |> WorkbenchWebhook.ordered()
    |> paginate(args)
  end

  def list_workbench_chatbots(workbench, args, _) do
    WorkbenchChatbot.for_workbench(workbench.id)
    |> WorkbenchChatbot.ordered()
    |> paginate(args)
  end

  def list_eval_results(%Workbench{id: id}, args, _) do
    WorkbenchEvalResult.for_workbench(id)
    |> WorkbenchEvalResult.ordered()
    |> paginate(args)
  end

  def list_workbench_job_activities(job, args, _) do
    WorkbenchJobActivity.for_workbench_job(job.id)
    |> WorkbenchJobActivity.ordered()
    |> activity_filters(args)
    |> paginate(args)
  end

  def workbench_job_activities(args, %{context: %{current_user: user}}) do
    WorkbenchJobActivity.ordered(WorkbenchJobActivity, [desc: :inserted_at])
    |> WorkbenchJobActivity.for_user(user)
    |> activity_filters(args)
    |> paginate(args)
  end

  def function_call_tool(%{tool_id: id}, _, _) when is_binary(id),
    do: {:ok, Workbenches.get_workbench_tool(id)}
  def function_call_tool(_, _, _), do: {:ok, nil}

  def kube_request_body(%{body: body, path: path}, _, _) when is_binary(body) do
    case Jason.decode(body) do
      {:ok, %{} = body} -> sanitize_kube_request_body(body, path)
      _ -> {:ok, body}
    end
  end
  def kube_request_body(%{body: %{} = body, path: path}, _, _),
    do: sanitize_kube_request_body(body, path)
  def kube_request_body(_, _, _), do: {:ok, nil}

  defp sanitize_kube_request_body(body, path) do
    KUtils.sanitize_kube_resource(body)
    |> KUtils.redact_secret(path)
    |> Jason.encode()
  end

  def kube_request_current(%{handle: handle, path: path, method: method}, _, %{context: %{current_user: user}})
      when is_binary(handle) and is_binary(path) do
    case normalize_kube_method(method) do
      "post" ->
        {:ok, nil}
      _ ->
        with %Cluster{} = cluster <- Clusters.get_cluster_by_handle(handle),
             {:ok, res} <- KubeGet.kube_request(cluster, user, path) do
          KUtils.sanitize_kube_resource(res)
          |> KUtils.redact_secret()
          |> ok()
        else
          _ -> {:ok, nil}
        end
    end
  end
  def kube_request_current(%{handle: handle, path: path}, _, %{context: %{current_user: user}})
      when is_binary(handle) and is_binary(path) do
    with %Cluster{} = cluster <- Clusters.get_cluster_by_handle(handle),
         {:ok, res} <- KubeGet.kube_request(cluster, user, path) do
      KUtils.sanitize_kube_resource(res)
      |> KUtils.redact_secret()
      |> ok()
    else
      _ -> {:ok, nil}
    end
  end
  def kube_request_current(_, _, _), do: {:ok, nil}

  defp normalize_kube_method(method) when is_binary(method), do: String.downcase(method)
  defp normalize_kube_method(_), do: nil

  def list_queued_prompts(job, args, _) do
    QueuedPrompt.for_workbench_job(job.id)
    |> QueuedPrompt.unconsumed()
    |> QueuedPrompt.ordered()
    |> paginate(args)
  end

  def queued_prompt_count(%WorkbenchJob{id: id}, _, _) do
    batch({__MODULE__, :queued_prompt_summaries}, id, fn summaries ->
      summary = Map.get(summaries, id, %{ready_count: 0, pending_count: 0})
      {:ok, summary.ready_count + summary.pending_count}
    end)
  end

  def queued_prompt_summary(%WorkbenchJob{id: id}, _, _) do
    batch({__MODULE__, :queued_prompt_summaries}, id, fn summaries ->
      {:ok, Map.get(summaries, id, %{ready_count: 0, pending_count: 0, next_at: nil})}
    end)
  end

  def queued_prompt_summaries(_, job_ids) do
    QueuedPrompt.for_workbench_jobs(job_ids)
    |> QueuedPrompt.unconsumed()
    |> QueuedPrompt.summaries_by_workbench_job()
    |> Console.Repo.all()
    |> Map.new()
  end

  def all_workbench_alerts(args, %{context: %{current_user: user}}) do
    Alert.for_user(user)
    |> Alert.ordered()
    |> paginate(args)
  end

  def all_workbench_issues(args, %{context: %{current_user: user}}) do
    Issue.for_user(user)
    |> Issue.ordered()
    |> paginate(args)
  end

  def aggregates(_, _) do
    prs = PullRequest.for_workbench_jobs()
          |> PullRequest.aggregates()

    with [pr] <- Console.Repo.all(prs),
         [eval] <- Console.Repo.all(WorkbenchEvalResult.aggregates()) do
      {:ok, %{
        pull_requests: pr.merged,
        pull_request_merge_rate: pr.merge_rate,
        eval_results: eval.average_grade,
      }}
    else
      _ -> {:error, "Failed to fetch aggregates"}
    end
  end

  def average_workbench_eval_results(args, %{context: %{current_user: user}}) do
    period = args[:period] || :day

    Workbench.ordered()
    |> Workbench.for_user(user)
    |> WorkbenchEvalResult.workbench_grades(period)
    |> Console.Repo.all()
    |> ok()
  end

  def workbench_usage(args, %{context: %{current_user: user}}) do
    period = args[:period] || :day

    Workbench.for_user(user)
    |> workbench_filters(args)
    |> maybe_search(Workbench, args)
    |> WorkbenchJob.workbench_usage(period)
    |> Console.Repo.all()
    |> ok()
  end

  def average_eval_results(args, _ctx) do
    period = args[:period] || :day

    WorkbenchEvalResult.average_grades(period)
    |> Console.Repo.all()
    |> ok()
  end

  def workbench_pull_requests(_args, _ctx) do
    PullRequest.with_workbench()
    |> Console.Repo.aggregate(:count, :id)
    |> ok()
  end

  def workbench_pr_merge_rate(args, _ctx) do
    period = args[:period] || :day

    PullRequest.merge_rates(period)
    |> Console.Repo.all()
    |> ok()
  end

  def workbench_pr_merge_rate_by_workbench(args, %{context: %{current_user: user}}) do
    period = args[:period] || :day

    Workbench.ordered()
    |> Workbench.for_user(user)
    |> PullRequest.workbench_merge_rates(period)
    |> Console.Repo.all()
    |> ok()
  end

  def metrics_tool(%WorkbenchJob{} = job, %{name: name, arguments: args}, %{context: %{current_user: user}}),
    do: Toolchain.metrics(job, name, args, user)

  def logs_tool(%WorkbenchJob{} = job, %{name: name, arguments: args}, %{context: %{current_user: user}}),
    do: Toolchain.logs(job, name, args, user)

  def traces_tool(%WorkbenchJob{} = job, %{name: name, arguments: args}, %{context: %{current_user: user}}),
    do: Toolchain.traces(job, name, args, user)

  def workbenches(args, %{context: %{current_user: user}}) do
    Workbench.ordered()
    |> Workbench.for_user(user)
    |> workbench_filters(args)
    |> maybe_search(Workbench, args)
    |> paginate(args)
  end

  def workbench_tools(args, %{context: %{current_user: user}}) do
    WorkbenchTool.ordered()
    |> WorkbenchTool.for_user(user)
    |> workbench_tool_filters(args)
    |> maybe_search(WorkbenchTool, args)
    |> paginate(args)
  end

  def all_skills(workbench, _args, _ctx) do
    Repo.preload(workbench, [:workbench_skills, :repository])
    |> Skills.skills()
  end

  def whimsey_text(%WorkbenchJob{} = job, _, _), do: Workbenches.whimsey_text(job)
  def whimsey_text(%WorkbenchJobActivity{} = activity, _, _), do: Workbenches.whimsey_text(activity)

  def create_workbench(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench(attrs, user)

  def update_workbench(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench(attrs, id, user)

  def delete_workbench(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench(id, user)

  def create_workbench_policy(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_policy(attrs, workbench_id, user)

  def update_workbench_policy(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_policy(attrs, id, user)

  def delete_workbench_policy(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_policy(id, user)

  def create_workbench_tool(%{attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_tool(attrs, user)

  def update_workbench_tool(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_tool(attrs, id, user)

  def delete_workbench_tool(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_tool(id, user)

  def create_workbench_job(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_job(attrs, Workbenches.get_workbench!(workbench_id), user)

  def create_queued_prompt(%{job_id: job_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_queued_prompt(attrs, job_id, user)

  def delete_queued_prompt(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_queued_prompt(id, user)

  def create_workbench_cron(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_cron(attrs, workbench_id, user)

  def update_workbench_cron(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_cron(attrs, id, user)

  def delete_workbench_cron(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_cron(id, user)

  def workbench_cron(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.fetch_workbench_cron(id, user)

  def create_workbench_prompt(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_prompt(attrs, workbench_id, user)

  def update_workbench_prompt(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_prompt(attrs, id, user)

  def delete_workbench_prompt(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_prompt(id, user)

  def workbench_prompt(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.fetch_workbench_prompt(id, user)

  def create_workbench_skill(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_skill(attrs, workbench_id, user)

  def update_workbench_skill(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_skill(attrs, id, user)

  def delete_workbench_skill(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_skill(id, user)

  def update_workbench_knowledge(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_knowledge(attrs, id, user)

  def delete_workbench_knowledge(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_knowledge(id, user)

  def create_workbench_eval(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_eval(attrs, workbench_id, user)

  def update_workbench_eval(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_eval(attrs, id, user)

  def delete_workbench_eval(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_eval(id, user)

  def workbench_eval_skill(%{id: id,} = args, %{context: %{current_user: user}}),
    do: Workbenches.workbench_eval_skill(id, args[:prompt], user)

  def create_workbench_webhook(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_webhook(attrs, workbench_id, user)

  def get_workbench_webhook(%{id: id}, %{context: %{current_user: user}}) do
    Workbenches.get_workbench_webhook!(id)
    |> allow(user, :read)
  end

  def update_workbench_webhook(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_webhook(attrs, id, user)

  def delete_workbench_webhook(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_webhook(id, user)

  def create_workbench_chatbot(%{workbench_id: workbench_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_workbench_chatbot(attrs, workbench_id, user)

  def update_workbench_chatbot(%{id: id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_chatbot(attrs, id, user)

  def delete_workbench_chatbot(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.delete_workbench_chatbot(id, user)

  def create_workbench_message(%{job_id: job_id, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.create_message(attrs, job_id, user)

  def workbench_pr_followup(%{url: url, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.pr_followup(attrs, url, user)

  def enqueue_workbench_pr_followup(%{url: url, attributes: attrs}, %{context: %{current_user: user}}),
    do: Workbenches.pr_queued_prompt(attrs, url, user)

  def approve_workbench_job_activity(%{id: id}, %{context: %{current_user: user}}),
    do: Workbenches.approve_job_activity(id, user)

  def reject_workbench_job_activity(%{id: id} = args, %{context: %{current_user: user}}),
    do: Workbenches.reject_job_activity(args[:reason], id, user)

  def update_workbench_job(%{job_id: id, attributes: attributes}, %{context: %{current_user: user}}),
    do: Workbenches.update_workbench_job(attributes, id, user)

  def cancel_workbench_job(%{job_id: id}, %{context: %{current_user: user}}),
    do: Workbenches.cancel_workbench_job(id, user)

  defp workbench_filters(query, args) do
    Enum.reduce(args, query, fn
      {:project_id, project_id}, q when is_binary(project_id) -> Workbench.for_project(q, project_id)
      _, q -> q
    end)
  end

  defp workbench_tool_filters(query, args) do
    Enum.reduce(args, query, fn
      {:project_id, project_id}, q when is_binary(project_id) -> WorkbenchTool.for_project(q, project_id)
      _, q -> q
    end)
  end

  defp workbench_job_filters(query, args) do
    Enum.reduce(args, query, fn
      {:alert, true}, q -> WorkbenchJob.with_alert(q)
      {:issue, true}, q -> WorkbenchJob.with_issue(q)
      _, q -> q
    end)
  end

  defp activity_filters(query, args) do
    Enum.reduce(args, query, fn
      {:status, status}, q when not is_nil(status) -> WorkbenchJobActivity.for_status(q, status)
      {:type, type}, q when not is_nil(type) -> WorkbenchJobActivity.for_type(q, type)
      _, q -> q
    end)
  end
end
