---
title: Workspace Encryption Guide
description: How to use `plural crypto backups` to create, list, and restore workspace backups.
---

Out of the box, Plural encrypts all configuration in your Plural workspace and stores an encryption key on your local machine.
This means that if anyone gets a copy of your Plural Git repository/workspace, all sensitive information will appear encrypted to them.

If you are changing machines or collaborating with colleagues, you'll need to know how to create and restore from the workspace
encryption backups.

## Your encryption key

When you initialize your Plural repository, Plural creates a directory in your home directory called `.plural`. Within this directory
is a file called `key`, which is your local encryption key. This key is required to decrypt any sensitive configuration within your
Plural workspace.

To import a preexisting key, you can run the following command:

```shell {% showHeader=false %}
cat /path/to/key | plural crypto import
```

## Encryption backup operations

### Create workspace backup

To create a backup for your local `key`, run:

```shell {% showHeader=false %}
plural crypto backups create
```

In the case that you lose your local encryption key, this will allow you to decrypt your repo.

### List backups

To list your workspace backups that you have created, run:

```shell {% showHeader=false %}
plural crypto backups list
```

### Restore from backup

In the event that you lose your `key` file or are on a new machine, you can restore from a backup that you have created
with this command:

```shell {% showHeader=false %}
plural crypto backups restore
```
