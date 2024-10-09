defmodule Console.Email.DigestTest do
  use Console.DataCase, async: false
  use Bamboo.Test, shared: true

  alias Console.Email.Digest
  alias Console.Email.Builder

  describe "#normal/0" do
    test "it can deliver some digest emails" do
      deployment_settings(smtp: %{
        host: "something",
        port: 43,
        sender: "notifications@plural.sh",
        user: "apikey",
        password: "bogus"
      })

      user1 = insert(:user)
      user2 = insert(:user)
      user3 = insert(:user, email_settings: %{digest: false})
      insert_list(3, :app_notification, user: user1)
      insert_list(2, :app_notification, user: user2)
      insert_list(2, :app_notification, user: user3)

      Digest.normal()

      assert_delivered_email Builder.Digest.email(user1, 3)
      assert_delivered_email Builder.Digest.email(user2, 2)
      refute_delivered_email Builder.Digest.email(user3, 2)
    end
  end
end
