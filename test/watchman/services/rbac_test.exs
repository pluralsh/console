defmodule Watchman.Services.RbacTest do
  use Watchman.DataCase, async: true
  alias Watchman.Services.Rbac

  describe "#validate/2" do
    test "it can validate user bindings" do
      user = insert(:user)
      role = insert(:role, repositories: ["repo"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)

      assert Rbac.validate(user, "repo", :read)
    end

    test "it can validate group bindings" do
      user = insert(:user)
      role = insert(:role, repositories: ["repo"], permissions: %{read: true})
      %{group: group} = insert(:group_member, user: user)
      insert(:role_binding, role: role, group: group)

      assert Rbac.validate(user, "repo", :read)
    end

    test "it can validate with wildcards" do
      user = insert(:user)
      role = insert(:role, repositories: ["*", "other-repo"], permissions: %{read: true})
      %{group: group} = insert(:group_member, user: user)
      insert(:role_binding, role: role, group: group)

      assert Rbac.validate(user, "repo", :read)
    end

    test "it will fail if no role matches" do
      user = insert(:user)
      role = insert(:role, repositories: ["*", "other-repo"], permissions: %{read: true})
      %{group: group} = insert(:group_member, user: user)
      insert(:role_binding, role: role, group: group)

      role = insert(:role, repositories: ["other-repo"], permissions: %{operate: true})
      insert(:role_binding, role: role, user: user)

      refute Rbac.validate(user, "repo", :operate)
    end
  end
end