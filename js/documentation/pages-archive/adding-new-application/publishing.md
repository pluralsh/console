---
title: Publishing a Plural Artifact
---

Every Plural account holder can act as a publisher to publish artifacts and in that way contribute open source applications to Plural's marketplace.
If you don't want to publish an application publicly straight away and make it available to everybody, you can first test it by releasing it privately whereby only users of your Plural account can install it.

## Create a publisher

To publish an artifact you first need to create a publisher with your Plural account admin.

1. Click on your profile on the bottom left on `app.plural.sh`.
2. Select `create publisher`.
3. Enter your information.
4. Hit save.

## Publish an Artifact with the Plural CLI

When you're done with implementing your artifact and you have created a publisher you're ready to publish it.

1. Navigate to the directory of your artifact in your local copy of the [Plural artifacts git repository](https://github.com/pluralsh/plural-artifacts).
2. Locate the `Pluralfile`.
3. Enter the name of your publisher as the first argument in the `ATTRIBUTES` line. E.g. if your publisher is called `mypublisher`, it should look like this:

```
REPO dagster
ATTRIBUTES mypublisher repository.yaml

TF terraform/*
HELM helm/*
RECIPE plural/recipes/*
```

4. Finally, publish your artifact with the command `plural apply -f Pluralfile`. E.g. for our dagster example

```console
$ plural apply -f Pluralfile
Setting attributes for dagster
upload progress 100% |███████████████████████████████████████████████████████████████| ( 0B/4.8 kB, )
pushing terraform terraform/aws
upload progress 100% |███████████████████████████████████████████████████████████████| ( 0B/1.7 kB, )
pushing helm helm/dagster...✓
pushing recipe plural/recipes/dagster-aws.yaml✓
```

## Public vs Private Artifacts

Artifacts can be published with a `private: true` or `private: false` setting in the `repository.yaml`.
Bundles from private artifacts are only visible for, and can only be downloaded and installed by, users from the same account the publisher was created in.
Artifacts published publicly by you are also visible in the public marketplace.
