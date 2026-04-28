# v0.12.16 (2026-04-27)

## New Features 🎉

* **feat: Add `WorkbenchCron` and `WorkbenchWebhook` CRDs, update `Workbench` and `WorkbenchTool` CRDs** ([#3453](https://github.com/pluralsh/console/pull/3453)) by @maciaszczykm

  > The addition of `WorkbenchCron` and `WorkbenchWebhook` Custom Resource Definitions (CRDs) enhances the Plural Console's capabilities by allowing users to schedule automated tasks and trigger actions based on webhooks within their workbench environments. This update improves workflow automation and integration, enabling users to manage cron jobs and webhook events more effectively, which is essential for streamlining operations in Kubernetes environments.

* **whitelist workspace field for mm** ([#3464](https://github.com/pluralsh/console/pull/3464)) by @JohnBlackwell

  > The workspace field has been added to the whitelist for both Elastic and OpenSearch log providers, enhancing the data captured during log processing. This change allows users to include custom workspace information, improving the granularity and relevance of log data for monitoring and analysis.

* **deprecate agent sessions in UI in favor of workbenches** ([#3466](https://github.com/pluralsh/console/pull/3466)) by @jsladerman

  > The user interface has transitioned from using agent sessions to workbenches, enhancing the management of AI interactions within the Plural Console. This change simplifies the user experience by consolidating functionalities into workbenches, making it easier for users to manage their AI tools and workflows without the complexity of separate agent sessions. This update is significant as it streamlines operations and improves overall usability for users engaging with AI features.

* **Compatibility Matrix Update 2026-04-22** ([#3467](https://github.com/pluralsh/console/pull/3467)) by @app/github-actions

  > The compatibility matrix has been updated to include new versions for several key components, such as Argo CD (now at version 3.3.8) and AWS EBS CSI Driver (version 1.59.0). These updates enhance functionality, including improved Server-Side Apply capabilities in Argo CD and a refreshed Kubernetes mixin in the kube-prometheus-stack, ensuring users have access to the latest features and fixes for better operational efficiency and performance.

* **Add Canvas generation agent** ([#3468](https://github.com/pluralsh/console/pull/3468)) by @michaeljguarino

  > The new Canvas generation agent has been added, enhancing the capabilities of the Plural Console by allowing users to create visual representations of their workflows and data. This feature streamlines the process of managing and visualizing Kubernetes resources, making it easier for users to understand and interact with their deployments. Additionally, updates to various setup guides and workflows ensure that users have the latest information and tools for effective cloud connection management across AWS, Azure, and GCP.

* **feat: Workbench improvements** ([#3469](https://github.com/pluralsh/console/pull/3469)) by @maciaszczykm

  > Workbench improvements enhance the user experience by introducing a more intuitive search and filtering system for integrations, allowing users to easily find and manage their tools. The updated interface includes a search bar, filter options, and improved card layouts, making it simpler to navigate and configure integrations within the Plural Console. These enhancements streamline workflows and improve accessibility to the tools needed for effective Kubernetes management.

* **feat(client): Enhance Workbench and WorkbenchTool fragments with new fields and observability configuration** ([#3470](https://github.com/pluralsh/console/pull/3470)) by @maciaszczykm

  > The Workbench and WorkbenchTool fragments have been enhanced with new fields for read and write bindings, as well as observability configuration options. These additions allow users to better manage permissions and monitor their Kubernetes resources, improving the overall observability and control within the Plural Console. This update is crucial for users looking to implement more granular access controls and observability metrics in their workflows.

* **feat: extend AgentRunFragment** ([#3471](https://github.com/pluralsh/console/pull/3471)) by @zreigz

  > The AgentRunFragment has been extended to include two new fields: `babysit` and `babysitInterval`. This enhancement allows users to specify whether the agent should remain active during execution and set a time interval for this babysitting function, improving control over agent operations and resource management during runtime.

* **extend AgentRuntFragment** ([#3472](https://github.com/pluralsh/console/pull/3472)) by @zreigz

  > The AgentRunFragment has been extended to include a new optional field for the branch, enhancing the granularity of agent run configurations. This addition allows users to specify the branch associated with an agent run, improving the clarity and management of deployments in multi-branch environments. This change is particularly beneficial for teams utilizing Git workflows, as it facilitates better tracking and organization of agent activities.

* **Compatibility Matrix Update 2026-04-23** ([#3473](https://github.com/pluralsh/console/pull/3473)) by @app/github-actions

  > The compatibility matrix for various EKS add-ons has been updated to include new versions and their supported Kubernetes versions. Notably, the aws-ebs-csi-driver, aws-efs-csi-driver, and coredns now support additional Kubernetes versions, enhancing flexibility and compatibility for users managing their EKS environments. This update ensures that users can leverage the latest features and improvements in these add-ons while maintaining compatibility with their existing Kubernetes clusters.

* **Compatibility Matrix Update 2026-04-23** ([#3474](https://github.com/pluralsh/console/pull/3474)) by @app/github-actions

  > The compatibility matrix has been updated to reflect new chart versions and features for several components, including Argo CD, Argo Workflows, Kubescape Operator, and Vector. Notably, Vector 0.55.0 introduces a new `windows_event_log` source, enhanced Azure authentication support, and significant internal metrics improvements, while also moving the Observability API from GraphQL to gRPC, requiring updates to existing integrations. These updates ensure users can leverage the latest capabilities and maintain compatibility with their Kubernetes environments.

* **feat(client): add workbench, webhook, and issueWebhook fields to WorkbenchCron and WorkbenchWebhook fragments** ([#3475](https://github.com/pluralsh/console/pull/3475)) by @maciaszczykm

  > The WorkbenchCron and WorkbenchWebhook fragments have been enhanced with new fields, including `workbench`, `webhook`, and `issueWebhook`, allowing for more detailed configurations and interactions within the Plural client. This update improves the flexibility and functionality of the workbench components, enabling users to better manage and automate their workflows related to cron jobs and webhooks.

* **Compatibility Matrix Update 2026-04-24** ([#3476](https://github.com/pluralsh/console/pull/3476)) by @app/github-actions

  > The compatibility matrix for EKS has been updated to include version '1.35' across multiple existing versions, ensuring that users can now leverage this latest version for enhanced compatibility. This update is crucial for maintaining up-to-date infrastructure and ensuring seamless integration with newer features and fixes in the Kubernetes ecosystem.

* **Compatibility Matrix Update 2026-04-24** ([#3477](https://github.com/pluralsh/console/pull/3477)) by @app/github-actions

  > The compatibility matrix has been updated to include new versions for several operators, including the kube-prometheus-stack, which now supports Grafana chart v12, introducing potential breaking changes that users should validate against their existing configurations. Additionally, the Argo Workflows operator has been upgraded to version 4.0.5, while the OpenTelemetry operator now supports version 0.149.0, ensuring users have access to the latest features and improvements across these critical components. This update is essential for maintaining compatibility and leveraging new functionalities in your Kubernetes environment.

* **Compatibility Matrix Update 2026-04-25** ([#3478](https://github.com/pluralsh/console/pull/3478)) by @app/github-actions

  > The compatibility matrix has been updated to include new versions for several components, notably the kube-prometheus-stack, which now supports version 84.0.1. This update includes dependency maintenance and a major version bump for the Grafana subchart, which may introduce new behavior. Additionally, the GPU Operator compatibility now specifies required images, enhancing clarity for users managing GPU workloads.

* **Compatibility Matrix Update 2026-04-26** ([#3479](https://github.com/pluralsh/console/pull/3479)) by @app/github-actions

  > The compatibility matrix has been updated to include new versions for both the External Secrets and Kube Prometheus Stack integrations. Notably, External Secrets version 2.4.0 introduces features such as leader election support for high availability deployments and enhanced secret fetching capabilities. Additionally, Kube Prometheus Stack version 84.1.0 adds an optional configuration to override the Prometheus scrape job name for the kube-apiserver, improving flexibility for users managing dashboards and alerts.


## Other Changes

* **Release rapid v0.12.15** ([#3462](https://github.com/pluralsh/console/pull/3462)) by @app/github-actions

  > The rapid release v0.12.15 introduces an updated version of the controller (0.0.183) and the console-rapid chart (0.4.17), enhancing the deployment operator for Plural CD. This update improves stability and performance, ensuring a more reliable experience for users managing their Kubernetes environments. Additionally, the app version has been incremented to 0.12.15, reflecting the latest improvements and features.

* **Release v0.12.15** ([#3463](https://github.com/pluralsh/console/pull/3463)) by @app/github-actions

  > The release of version v0.12.15 introduces updates to the Plural Console and its dependencies, including the controller and datastore operators. Notably, the controller has been upgraded to version 0.0.183 and the datastore to version 0.0.59, enhancing functionality and stability. This update ensures users benefit from the latest improvements and fixes, contributing to a more robust Kubernetes management experience.


**Full Changelog**: [v0.12.15...v0.12.16](https://github.com/pluralsh/console/compare/v0.12.15...v0.12.16)

# v0.12.15 (2026-04-27)

## New Features 🎉

* **feat(cloud-query): add Azure integration with support for metrics and logs queries** ([#3421](https://github.com/pluralsh/console/pull/3421)) by @floreks

  > Azure integration has been added to the Plural Console, enabling users to perform metrics and logs queries directly from Azure Monitor. This enhancement allows for seamless monitoring and observability of Azure resources, providing users with a unified experience for managing their cloud infrastructure. With this feature, users can now leverage Azure's capabilities alongside existing tools, streamlining their workflows and improving operational efficiency.

* **feat: Add webhook actor configuration and few other improvements** ([#3445](https://github.com/pluralsh/console/pull/3445)) by @maciaszczykm

  > Webhook actor configuration has been introduced, enhancing the flexibility of webhook management within the platform. This update allows users to customize webhook behaviors, improving integration capabilities and streamlining workflows. Additionally, various improvements have been made to the user interface components, ensuring a more cohesive and user-friendly experience when managing webhooks and related tasks.

* **Compatibility Matrix Update 2026-04-19** ([#3450](https://github.com/pluralsh/console/pull/3450)) by @app/github-actions

  > The compatibility matrix has been updated to include new details for several applications, including External Secrets, Argo CD, and GPU Operator. Notably, External Secrets now features enhancements in authentication methods and updates to container images, while Argo CD's release notes provide insights into bug fixes and minor version upgrades. Additionally, the GPU Operator has been updated to version 26.3.1, ensuring compatibility with Kubernetes versions 1.33 to 1.35. These updates are crucial for users to maintain optimal performance and security in their Kubernetes environments.

* **CloudQuery support in workbenches** ([#3451](https://github.com/pluralsh/console/pull/3451)) by @michaeljguarino

  > CloudQuery support has been integrated into workbenches, allowing users to configure and manage cloud connections directly within the platform. This enhancement streamlines the process of connecting to cloud services, enabling more efficient infrastructure management and improved automation capabilities. Users can now leverage CloudQuery's features to enhance their workflows and gain better insights into their cloud environments.

* **feat(cloud-query): add jeager traces integration support** ([#3454](https://github.com/pluralsh/console/pull/3454)) by @floreks

  > Jaeger traces integration has been added to the Plural Console, allowing users to configure and query distributed traces directly from the workbench. This enhancement supports observability by enabling users to input Jaeger-specific credentials and URLs, facilitating better monitoring and troubleshooting of Kubernetes services. The integration streamlines the process of accessing trace data, which is crucial for identifying performance bottlenecks and ensuring application reliability.

* **add cloud connections tools to workbenches** ([#3455](https://github.com/pluralsh/console/pull/3455)) by @jsladerman

  > Cloud connection tools have been added to workbenches, enhancing the ability to manage and configure cloud integrations directly within the Plural Console. This update allows users to easily create and edit cloud connections, streamlining the process of integrating various cloud services into their Kubernetes workflows. By simplifying cloud connection management, users can improve their operational efficiency and better leverage cloud resources.

* **Compatibility Matrix Update 2026-04-21** ([#3456](https://github.com/pluralsh/console/pull/3456)) by @app/github-actions

  > The compatibility matrix for the EKS add-on has been updated to include support for Kubernetes version 1.35. This enhancement ensures that users can leverage the latest Kubernetes features and improvements, providing greater flexibility and performance for their deployments.

* **Compatibility Matrix Update 2026-04-21** ([#3457](https://github.com/pluralsh/console/pull/3457)) by @app/github-actions

  > The compatibility matrix has been updated to include version 3.2.2 of the AWS Load Balancer Controller, which introduces enhancements such as improved Ingress-to-Gateway translation with additional annotations and safer handling of ListenerSet resources when Gateway API CRDs are missing. Users are advised to perform a standard Helm upgrade to ensure the new image tag is applied and to re-apply CRDs as necessary. This update is crucial for maintaining compatibility and optimizing functionality in Kubernetes environments utilizing the AWS Load Balancer Controller.

* **feat: implement sentinel trigger** ([#3459](https://github.com/pluralsh/console/pull/3459)) by @zreigz

  > The implementation of the Sentinel trigger feature introduces a new Custom Resource Definition (CRD) for managing Sentinel triggers within the Plural Console. This enhancement allows users to define and run Sentinel triggers, facilitating automated responses to specific events in Kubernetes, thereby improving operational efficiency and responsiveness in managing deployments.

* **Fix soft serve container** ([#3461](https://github.com/pluralsh/console/pull/3461)) by @michaeljguarino

  > The soft serve container has been updated to streamline the data copying process, consolidating the data directories to improve efficiency. This change ensures that the application runs with the correct permissions and reduces potential errors related to data access, enhancing overall performance and reliability for users deploying the soft serve functionality.


## Other Changes

* **Release rapid v0.12.14** ([#3448](https://github.com/pluralsh/console/pull/3448)) by @app/github-actions

  > The release of rapid v0.12.14 introduces an updated version of the deployment operator, now at version 0.0.182, which enhances the stability and performance of the Plural Console. This update also includes improvements in the Chart.lock and Chart.yaml files, ensuring users benefit from the latest features and fixes in their Kubernetes deployments. Upgrading to this version is recommended to take advantage of these enhancements.

* **Release v0.12.14** ([#3449](https://github.com/pluralsh/console/pull/3449)) by @app/github-actions

  > The release of version v0.12.14 introduces updates to the Plural Console and its dependencies, including the controller and datastore operators, which have been upgraded to versions 0.0.182 and 0.0.58, respectively. These updates enhance the functionality and stability of the deployment operator, ensuring improved performance and compatibility within bring-your-own-Kubernetes setups. Users can expect a more robust experience with the latest features and fixes integrated into this release.


**Full Changelog**: [v0.12.14...v0.12.15](https://github.com/pluralsh/console/compare/v0.12.14...v0.12.15)

