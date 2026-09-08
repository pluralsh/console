---
title: Add Users to an Application
description: How to give end users access to an application installed using Plural.
---

If you've enabled OIDC for a set of applications, you can easily give users or groups access to that application. To enable access to a particular application, you can add permissions via the App Settings for a specific cluster or from the Plural Console. Any changes made in either location will be synced.

## Through Plural App Settings

Admin users who have installed an application have the ability to add users to that application. To add users, navigate to the installed application from your Clusters Overview page. Click the three dots on the application and select "App settings" in the menu. Select OpenID Connect from the sidebar on the left, and add any new users or groups and click "Save" in the bottom right.

![](/assets/operations/app-settings-add-users.png)

## Through Plural Console

Any Plural Console user with permissions to manage users and groups can add users to any installed application. Navigate to the Plural Console and select your application from the Application Overview tab. Click the "User management" option from the menu on the left. This allows you to search for additional user or group bindings to add for access. Add any new users or groups and click "Update" in the bottom right.

![](/assets/operations/add-users-console.png)

For applications not using OIDC, permissions are managed through the individual applications.
