defmodule Watchman.Recurse.UsersTest do
  use Watchman.DataCase, async: true
  alias Watchman.PubSub
  alias Watchman.PubSub.Consumers.Recurse
  alias Watchman.Services.Users

  describe "UserCreated" do
    test "it will add the user to all global groups" do
      user   = insert(:user)
      group  = insert(:group, global: true)
      ignore = insert(:group)

      event = %PubSub.UserCreated{item: user}
      {1, _} = Recurse.handle_event(event)

      assert Users.get_group_member(group.id, user.id)
      refute Users.get_group_member(ignore.id, user.id)
    end
  end
end