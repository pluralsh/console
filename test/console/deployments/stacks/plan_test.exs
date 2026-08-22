defmodule Console.Deployments.Stacks.PlanTest do
  use Console.DataCase, async: true
  alias Console.Deployments.Stacks.Plan
  alias Console.Schema.StackRun

  describe "run_type/1" do
    test "dry runs are plans, destroy runs are destroys, otherwise apply" do
      assert Plan.run_type(%StackRun{dry_run: true, destroy: false}) == :plan
      assert Plan.run_type(%StackRun{dry_run: false, destroy: true}) == :destroy
      assert Plan.run_type(%StackRun{dry_run: false, destroy: false}) == :apply
    end

    test "dry runs take precedence over destroy" do
      assert Plan.run_type(%StackRun{dry_run: true, destroy: true}) == :plan
    end
  end

  describe "convert/1" do
    test "reduces terraform show json to the spacelift plan policy shape" do
      converted = Plan.convert(%{
        "format_version" => "1.2",
        "terraform_version" => "1.9.8",
        "applyable" => true,
        "complete" => true,
        "errored" => false,
        "output_changes" => %{"id" => %{"actions" => ["create"]}},
        "deferred_changes" => [],
        "resource_changes" => [
          %{
            "address" => "module.web.aws_instance.app",
            "module_address" => "module.web",
            "mode" => "managed",
            "type" => "aws_instance",
            "name" => "app",
            "index" => 0,
            "provider_name" => "registry.terraform.io/hashicorp/aws",
            "change" => %{
              "actions" => ["update"],
              "before" => %{"instance_type" => "t3.micro"},
              "after" => %{"instance_type" => "t3.small"},
              "after_unknown" => %{"id" => true},
              "before_sensitive" => false,
              "after_sensitive" => false,
              "replace_paths" => []
            }
          }
        ]
      })

      assert converted == %{
        "terraform_version" => "1.9.8",
        "resource_changes" => [
          %{
            "address" => "module.web.aws_instance.app",
            "type" => "aws_instance",
            "name" => "app",
            "provider_name" => "aws",
            "change" => %{
              "actions" => ["update"],
              "before" => %{"instance_type" => "t3.micro"},
              "after" => %{"instance_type" => "t3.small"}
            }
          }
        ]
      }
    end

    test "returns an empty plan when input is missing" do
      assert Plan.convert(nil) == %{"terraform_version" => nil, "resource_changes" => []}
    end
  end
end
