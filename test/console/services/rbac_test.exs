defmodule Console.Services.RbacTest do
  use Console.DataCase, async: true
  alias Console.Services.Rbac

  describe "#cached_preload/1" do
    test "it loads the same bindings as preload/1" do
      user = insert(:user)
      role = insert(:role, repositories: ["repo"], permissions: %{read: true})
      insert(:role_binding, role: role, user: user)
      %{group: group} = insert(:group_member, user: user)
      insert(:role_binding, role: insert(:role), group: group)

      cached = Rbac.cached_preload(user)
      loaded = Rbac.preload(user)

      assert ids(cached.role_bindings) == ids(loaded.role_bindings)
      assert ids(cached.group_role_bindings) == ids(loaded.group_role_bindings)
      assert ids(cached.groups) == [group.id]
      assert Enum.all?(cached.group_role_bindings, &match?(%{role: %Console.Schema.Role{}}, &1))
    end

    test "it passes through nil" do
      refute Rbac.cached_preload(nil)
    end
  end

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
