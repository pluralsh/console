defmodule Console.Deployments.Policy.Input do
  alias Console.Schema.{
    GitRepository,
    Project,
    Stack,
    StackInfracostResource,
    StackPolicyViolation,
    StackRun,
    StackViolationCause,
    User,
    Workbench
  }

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
      "git" => stack_git(stack)
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

  def commit(_), do: %{}

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
end
