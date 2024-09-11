defmodule Console.Deployments.PubSub.EmailTest do
  use Console.DataCase, async: false
  use Bamboo.Test, shared: true

  alias Console.PubSub
  alias Console.Email.Builder
  alias Console.Deployments.PubSub.Email

  setup do
    [settings: deployment_settings(smtp: %{
      host: "something",
      port: 43,
      sender: "notifications@plural.sh",
      user: "apikey",
      password: "bogus"
    })]
  end

  describe "SharedSecretCreated" do
    test "it will register a deliver an email to recipients" do
      notif_user = insert(:user)
      share = insert(:shared_secret, notification_bindings: [%{user_id: notif_user.id}])
      actor = insert(:user)

      event = %PubSub.SharedSecretCreated{item: share, actor: actor}
      Email.handle_event(event)

      assert_delivered_email Builder.Secret.email(share, actor)
    end
  end
end
