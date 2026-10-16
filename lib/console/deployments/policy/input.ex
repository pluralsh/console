defmodule Console.Deployments.Policy.Input do
  alias Console.Deployments.Stacks.Plan
  alias Console.Schema.{
    GitRepository,
    Project,
    Stack,
    StackEnvironment,
    StackFile,
    StackInfracostResource,
    StackPolicyViolation,
    StackRun,
    StackState,
    StackViolationCause,
    User,
    Workbench
  }

  @doc "Builds the full input document for a run-stage stack policy evaluation."
  def stack_run(%Stack{} = stack, sha, attrs, user) do
    %{
      "stage" => "run",
      "now" => now(),
      "trigger" => trigger(attrs),
      "actor" => actor(user),
      "stack" => __MODULE__.stack(stack),
      "commit" => commit(%{sha: sha, message: attrs[:message], committer: attrs[:committer]}),
      "run" => run_intent(stack, attrs),
      "variables" => variables(stack),
      "environment" => environment(stack.environment),
      "files" => files(stack.files),
      "changes" => changes(attrs[:changes])
    }
  end

  @doc "Builds the full input document for an approval-stage stack policy evaluation."
  def stack_approval(%StackRun{} = run) do
    %{
      "stage" => "approval",
      "now" => now(),
      "plan" => plan(run),
      "actor" => actor(run.actor),
      "run_type" => Plan.run_type(run),
      "stack" => stack(run.stack),
      "commit" => commit(run),
      "costs" => costs(run.infracost_resources),
      "violations" => violations(run.violations),
      "run" => run_intent(run),
      "variables" => variables(run),
      "environment" => environment(run.environment),
      "files" => files(run.files)
    }
  end

  @doc "Builds the target payload used as binding policy input."
  def binding(%Workbench{} = target), do: %{workbench: clean_binding_target(target)}
  def binding(%Stack{} = target), do: %{stack: clean_binding_target(target)}

  @doc "Builds the actor payload used as policy input."
  def actor(%User{
    id: id,
    name: name,
    email: email,
    groups: groups,
    roles: roles,
    service_account: service_account
  }) do
    %{
      "id" => id,
      "name" => name,
      "email" => email,
      "service_account" => !!service_account,
      "roles" => actor_roles(roles),
      "groups" => if(is_list(groups), do: Enum.map(groups, & &1.name), else: [])
    }
  end

  def actor(_), do: %{}

  defp actor_roles(%{admin: admin}), do: %{"admin" => !!admin}
  defp actor_roles(_), do: %{}

  @doc "Builds the stack payload used as policy input."
  def stack(%Stack{name: name} = stack) do
    %{
      "name" => name,
      "project" => stack_project(stack.project),
      "git" => stack_git(stack),
      "variables" => variables(stack)
    }
  end

  def stack(_), do: %{}

  @doc "Builds the commit payload used as policy input."
  def commit(%StackRun{} = run) do
    %{
      "sha" => git_field(run.git, :ref),
      "message" => run.message,
      "committer" => run.committer
    }
  end

  def commit(%{sha: sha} = commit) do
    %{
      "sha" => sha,
      "message" => Map.get(commit, :message),
      "committer" => Map.get(commit, :committer)
    }
  end

  def commit(_), do: %{}

  @doc "Returns stack or run variables, or an empty map when none are set."
  def variables(%{variables: vars}) when is_map(vars), do: vars
  def variables(_), do: %{}

  @doc "Builds environment variables for policy input. Secret values are omitted."
  def environment(vars) when is_list(vars), do: Enum.map(vars, &env_var/1)
  def environment(_), do: []

  @doc "Builds stack files for policy input. File contents are omitted."
  def files(files) when is_list(files), do: Enum.map(files, &file/1)
  def files(_), do: []

  @doc "Builds the changed-file list for policy input."
  def changes(files) when is_list(files), do: files
  def changes(_), do: []

  @doc "Builds the cost payload used as policy input."
  def costs(resources) when is_list(resources), do: Enum.map(resources, &cost/1)
  def costs(_), do: []

  @doc "Builds the vulnerability violation payload used as policy input."
  def violations(violations) when is_list(violations), do: Enum.map(violations, &violation/1)
  def violations(_), do: []

  defp cost(%StackInfracostResource{} = resource) do
    %{
      "resource_scope" => resource.resource_scope,
      "project_name" => resource.project_name,
      "name" => resource.name,
      "resource_type" => resource.resource_type,
      "hourly_cost" => decimal_float(resource.hourly_cost),
      "monthly_cost" => decimal_float(resource.monthly_cost),
      "monthly_usage_cost" => decimal_float(resource.monthly_usage_cost),
      "raw_resource" => resource.raw_resource
    }
  end

  defp violation(%StackPolicyViolation{} = violation) do
    %{
      "severity" => violation.severity,
      "policy_id" => violation.policy_id,
      "policy_url" => violation.policy_url,
      "policy_module" => violation.policy_module,
      "title" => violation.title,
      "description" => violation.description,
      "resolution" => violation.resolution,
      "causes" => violation_causes(violation.causes)
    }
  end

  defp violation_causes(causes) when is_list(causes), do: Enum.map(causes, &violation_cause/1)
  defp violation_causes(_), do: []

  defp violation_cause(%StackViolationCause{} = cause) do
    %{
      "resource" => cause.resource,
      "start" => cause.start,
      "end" => cause.end,
      "filename" => cause.filename,
      "lines" => violation_lines(cause.lines)
    }
  end

  defp violation_lines(lines) when is_list(lines) do
    Enum.map(lines, fn line ->
      %{
        "content" => line.content,
        "line" => line.line,
        "first" => line.first,
        "last" => line.last
      }
    end)
  end

  defp violation_lines(_), do: []

  defp env_var(%StackEnvironment{secret: true, name: name}),
    do: %{"name" => name, "secret" => true}
  defp env_var(%StackEnvironment{name: name, value: value, secret: secret}),
    do: %{"name" => name, "value" => value, "secret" => secret == true}
  defp env_var(_), do: %{}

  defp file(%StackFile{path: path}), do: %{"path" => path}
  defp file(_), do: %{}

  defp decimal_float(%Decimal{} = value), do: Decimal.to_float(value)
  defp decimal_float(_), do: nil

  defp clean_binding_target(target) do
    target
    |> Map.from_struct()
    |> Console.clean()
  end

  defp stack_project(%Project{id: id, name: name}), do: %{"id" => id, "name" => name}
  defp stack_project(_), do: %{}

  defp stack_git(%Stack{git: git, repository: repo, sha: sha}) do
    %{
      "ref" => git_field(git, :ref),
      "folder" => git_field(git, :folder),
      "sha" => sha,
      "url" => repo_url(repo)
    }
  end

  defp git_field(%{ref: ref}, :ref), do: ref
  defp git_field(%{folder: folder}, :folder), do: folder
  defp git_field(_, _), do: nil

  defp repo_url(%GitRepository{url: url}), do: url
  defp repo_url(_), do: nil

  defp now(), do: DateTime.to_iso8601(DateTime.utc_now())

  defp trigger(%{trigger: %{source: source}}), do: %{"source" => trigger_source(source)}
  defp trigger(%{trigger: source}), do: %{"source" => trigger_source(source)}
  defp trigger(_), do: %{}

  defp trigger_source(source) when is_atom(source), do: Atom.to_string(source)
  defp trigger_source(source) when is_binary(source), do: source
  defp trigger_source(_), do: nil

  defp run_intent(%StackRun{dry_run: dry_run, destroy: destroy, pull_request_id: pr_id}) do
    %{
      "dry_run" => !!dry_run,
      "destroy" => !!destroy,
      "pull_request" => is_binary(pr_id)
    }
  end
  defp run_intent(%Stack{} = stack, attrs) do
    %{
      "dry_run" => !!attrs[:dry_run],
      "destroy" => destroy_run?(stack, attrs),
      "pull_request" => is_binary(attrs[:pull_request_id])
    }
  end

  defp destroy_run?(%Stack{deleted_at: deleted}, _) when not is_nil(deleted), do: true
  defp destroy_run?(_, %{destroy: true}), do: true
  defp destroy_run?(_, _), do: false

  defp plan(%StackRun{state: %StackState{plan_json: plan}}) when is_map(plan),
    do: Plan.convert(plan)
  defp plan(_), do: Plan.convert(nil)
end
