defmodule Console.GraphQl.Deployments.SettingsMutationsTest do
  use Console.DataCase, async: true

  describe "createProject" do
    test "admins can create a project" do
      {:ok, %{data: %{"createProject" => create}}} = run_query("""
        mutation Create($attrs: ProjectAttributes!) {
          createProject(attributes: $attrs) {
            id
            name
          }
        }
      """, %{"attrs" => %{"name" => "test"}}, %{current_user: admin_user()})

      assert create["id"]
      assert create["name"] == "test"
    end
  end

  describe "updateProject" do
    test "admins can update a project" do
      proj = insert(:project)
      {:ok, %{data: %{"updateProject" => update}}} = run_query("""
        mutation update($id: ID!, $attrs: ProjectAttributes!) {
          updateProject(id: $id, attributes: $attrs) {
            id
            name
          }
        }
      """, %{"attrs" => %{"name" => "test"}, "id" => proj.id}, %{current_user: admin_user()})

      assert update["id"] == proj.id
      assert update["name"] == "test"
    end
  end

  describe "deleteProject" do
    test "admins can delete a project" do
      proj = insert(:project)
      {:ok, %{data: %{"deleteProject" => deleted}}} = run_query("""
        mutation delete($id: ID!) {
          deleteProject(id: $id) {
            id
            name
          }
        }
      """, %{"id" => proj.id}, %{current_user: admin_user()})

      assert deleted["id"] == proj.id
      assert deleted["name"] == proj.name
    end
  end

  describe "dismissOnboarding" do
    test "admins can dismiss the onboarding" do
      settings = deployment_settings()
      {:ok, %{data: %{"dismissOnboarding" => dismissed}}} = run_query("""
        mutation dismissOnboarding {
          dismissOnboarding {
            onboarded
          }
        }
      """, %{}, %{current_user: admin_user()})

      assert dismissed["onboarded"]
      assert refetch(settings).onboarded
    end
  end
end
