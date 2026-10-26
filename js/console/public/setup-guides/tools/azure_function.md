# Azure Function tool setup

Use this guide to fill `Azure connection`, `Function identifier`, `Description`, and `Input schema (JSON)`.

## 1) Create the Azure cloud connection

Create an Azure cloud connection with the Azure cloud connection setup guide. The connection needs `Tenant ID`, `Client ID`, `Client secret`, and `Subscription ID`. The subscription must be the same subscription as the function resource id.

The guide’s `Reader` role includes `microsoft.web/sites/functions/read` (`Get Function`) and does not include list-keys. Invoke lists function secrets, then function keys, then host keys, before calling `Get Function` and `POST`ing the payload. Grant these actions from [Microsoft.Web permissions](https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/web-and-mobile) on the function app, in addition to `Reader`:

- `microsoft.web/sites/functions/listsecrets/action`
- `microsoft.web/sites/functions/listkeys/action`
- `microsoft.web/sites/host/listkeys/action`

## 2) Fill the Workbench tool form

- `Azure connection`: the connection from step 1
- `Function identifier`: `/subscriptions/{subscription}/resourceGroups/{group}/providers/Microsoft.Web/sites/{site}/functions/{name}`
- `Description`: what the function does
- `Input schema (JSON)`: JSON schema for the object sent as the JSON body

## 3) Approval

`Requires approval` pauses for sign-off before the function is invoked.
