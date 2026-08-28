defmodule Console.Deployments.Stacks.Plan do
  @moduledoc """
  Converts `terraform show -json` output into the reduced plan Spacelift exposes
  to plan policies, instead of passing the full Terraform document.

  See: https://docs.spacelift.io/concepts/policy/terraform-plan-policy
  """
  alias Console.Schema.StackRun
  import Map, only: [get: 2]

  @type run_type :: :apply | :plan | :destroy

  @doc """
  Infers the policy run type from the stack run: dry runs are plans, destroy
  runs are destroys, and everything else is an apply.
  """
  @spec run_type(StackRun.t()) :: run_type
  def run_type(%StackRun{dry_run: true}), do: :plan
  def run_type(%StackRun{destroy: true}), do: :destroy
  def run_type(_), do: :apply

  @doc """
  Reduces a Terraform plan JSON document to `resource_changes` and
  `terraform_version`. Each change keeps address, type, name, a short
  provider name, and `change.{actions, before, after}`.
  """
  @spec convert(map | nil) :: map
  def convert(plan) when is_map(plan) do
    %{
      "terraform_version" => get(plan, "terraform_version"),
      "resource_changes" => Enum.map(list(get(plan, "resource_changes")), &convert_change/1)
    }
  end
  def convert(_), do: %{"terraform_version" => nil, "resource_changes" => []}

  defp convert_change(change) when is_map(change) do
    %{
      "address" => get(change, "address"),
      "type" => get(change, "type"),
      "name" => get(change, "name"),
      "provider_name" => provider_name(get(change, "provider_name")),
      "change" => convert_diff(get(change, "change"))
    }
  end
  defp convert_change(_), do: %{"change" => %{"actions" => []}}

  defp convert_diff(diff) when is_map(diff) do
    %{
      "actions" => list(get(diff, "actions")),
      "before" => get(diff, "before"),
      "after" => get(diff, "after")
    }
  end
  defp convert_diff(_), do: %{"actions" => []}

  defp provider_name(name) when is_binary(name),
    do: name |> String.split("/") |> List.last()
  defp provider_name(name), do: name

  defp list(items) when is_list(items), do: items
  defp list(_), do: []
end
