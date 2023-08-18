export const testMd = [
  `
What can we do to help you with Plural, using open source, or kubernetes?
`,
  `
How do I install an app?
`,
  `
To install an app on Plural, you have a few options:

1. Using the Cloud Shell: The Cloud Shell is a web-based command-line tool that you can access from your Plural Console. Open the Cloud Shell and execute the command \`plural bundle install <app-name> <bundle-name>\`. This will install the specified app and bundle onto your Plural environment.

2. Using the CLI: If you have set up Plural CLI on your local machine, you can install an app by running the same command mentioned above (\`plural bundle install <app-name> <bundle-name>\`) in your terminal or command prompt.

3. Installing from the Plural Console: You can also install applications directly from the Plural Console. Log in to your Plural Console, navigate to the Apps section, and click on the "Install App" button. This will guide you through the installation process, including selecting the app and bundle, and configuring any necessary settings.

During the installation process, you may be prompted to provide additional configuration details for your app, such as enabling Plural OIDC for single sign-on. Make sure to answer these questions according to your requirements.

Please note that the exact installation steps may vary depending on your specific Plural setup and configuration. It's recommended to consult the Plural documentation or reach out to their support team if you encounter any difficulties during the installation process.
`,
  `
How do I install airbyte?
`,
  `
To install Airbyte using Plural, you can indeed use the \`plural bundle install\` command. Here's an example of how to install Airbyte on AWS using Plural:

\`\`\`javascript
plural bundle install airbyte airbyte-aws
\`\`\`

This command will install the Airbyte app and the corresponding AWS bundle onto your Plural environment. The bundle contains all the necessary configurations and resources specific to deploying Airbyte on AWS.

Alternatively, if you prefer to deploy Airbyte outside of Plural, you have multiple options:

1. Docker: You can deploy Airbyte by running it in a Docker container. You can find instructions on how to deploy Airbyte using Docker in the Airbyte documentation.

2. AWS EC2: You can deploy Airbyte on an AWS EC2 instance by following the instructions provided in the Airbyte deployment documentation for AWS.

3. Azure, GCP, Oracle Cloud, Digital Ocean: Similarly, you can deploy Airbyte on other cloud providers such as Azure, GCP, Oracle Cloud, or Digital Ocean by following the corresponding deployment instructions provided by Airbyte.

4. Kubernetes: If you're using Kubernetes, you can deploy Airbyte on your Kubernetes cluster. The Airbyte documentation provides detailed instructions on how to deploy Airbyte on Kubernetes.

5. Restack: Restack is another platform that enables deploying and managing open source applications. You can use Restack to deploy Airbyte to production as well.

6. Airbyte Cloud: If you want the fastest and most reliable way to run Airbyte, you can consider using Airbyte Cloud, which is a hosted version of Airbyte managed by the Airbyte team. With Airbyte Cloud, you can avoid the hassle of managing infrastructure and focus on using Airbyte for your data integration needs.

Choose the deployment option that best suits your requirements and follow the corresponding documentation to install and set up Airbyte.
`,
  `
How do I remove argocd?
`,
  `
Thank you for providing the helpful context. To remove Argo CD from your cluster, you can use either the Helm command or the Argo CD CLI command:

Using Helm:

1. Open a terminal or command prompt.

2. Run the following command to uninstall Argo CD:
\`\`\`javascript
helm uninstall argocd
\`\`\`

This command will remove the Argo CD release from your cluster.

Using the Argo CD CLI:

1. Open a terminal or command prompt.

2. Run the following command to uninstall Argo CD:
\`\`\`json
argocd uninstall
\`\`\`

This command will uninstall Argo CD and all associated resources from your cluster.

Please note that uninstalling Argo CD will remove all applications and configurations managed by Argo CD, so make sure to backup any important data or configurations before proceeding with the uninstallation.

Additionally, the specific command may vary depending on your cluster setup and configuration. It's always recommended to consult the official documentation of Argo CD for the most up-to-date and accurate uninstallation instructions.
`,
  `
Where is the docs page for security issues?
`,
  `
I apologize for the confusion. If you are looking for the documentation page specifically related to security issues for a particular tool or platform, it's best to check the official documentation or website of that tool or platform. Here are a few general steps to locate the documentation for security issues:

- Start by searching the official website or documentation of the tool or platform in question. Look for a "Security" or "Security Issues" section in the documentation.

- If the documentation does not have a dedicated section for security issues, check for a "Support" or "Community" section. In these sections, you may find resources such as security advisories, bug reporting, or contact information for reporting security-related concerns.

- Another option is to search for the security issues or vulnerabilities directly in the tool or platform's issue tracker or repository on platforms like GitHub. Look for a "Issues" or "Security" tab in the repository to search for known security issues or vulnerabilities.

Remember, security issues and vulnerabilities can vary depending on the specific tool or platform you are using. Therefore, it is essential to consult the official documentation or resources related to that specific tool or platform to get accurate and up-to-date information on security issues.
`,
  `
where is the plural documentation website?
`,
  `
Thank you for providing the helpful context. Indeed, the Plural documentation website can be found at the URL you mentioned: [https://plural.sh/docs](https://plural.sh/docs).

You can visit this website to access the official Plural documentation, which provides detailed guidance, tutorials, and reference materials on how to use Plural, deploy apps, manage environments, and perform other tasks related to the Plural platform.

The documentation website is a valuable resource for understanding and leveraging the features and capabilities of Plural effectively. If you have specific questions or need assistance with Plural, referring to the documentation is usually a good starting point.

Please note that the documentation may vary depending on the Plural version you are using. Make sure to refer to the documentation that corresponds to your specific Plural version to ensure you have the most accurate and relevant information.
`,
]
