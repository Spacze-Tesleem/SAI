**[Gitpod has been renamed to Ona](https://ona.com/stories/gitpod-is-now-ona) - mission control for software projects and software engineering agents**. We no longer recommend this version of Gitpod; users should take advantage of Ona's [free tier](https://app.gitpod.io/) or [contact sales for enterprise](https://ona.com/enterprise). With Ona you gain more powerful development environments than Gitpod Classic with industry-standard specifications based on Dev Container and Ona Agents.

![Ona Banner](https://github.com/user-attachments/assets/68f8c148-07da-4831-a6f6-ff4d1f1ec321)

## Gitpod Classic

Gitpod Classic is a developer platform providing on-demand, pre-configured development environments in the cloud. It allows developers to spin up secure workspaces with a simple `.gitpod.yml` configuration file, eliminating the need for manual environment setup. The platform integrates with GitHub, GitLab, Bitbucket, and Azure DevOps, offering prebuilt environments, collaborative code reviews, and a browser-based VS Code experience.

> **Important:** [Gitpod Classic pay-as-you-go sunset on October 15, 2025](https://ona.com/stories/gitpod-classic-payg-sunset). See Ona's blog for detailed instructions.

The dashboard entrypoint remains the original Gitpod application. A separate SAI prototype is retained under `components/dashboard/src/sai`; it is not mounted as the default interface. Prototype-specific Supabase and OpenRouter notes are in [`components/dashboard/README.md`](components/dashboard/README.md).

## Documentation

Gitpod documentation is available at [www.gitpod.io/docs](https://www.gitpod.io/docs), including the [Gitpod tutorial](https://www.gitpod.io/docs/introduction/gitpod-tutorial), workspace lifecycle, repository configuration, organizations, editors, and [Gitpod samples](https://github.com/gitpod-samples).

## Related projects

- [Workspace images](https://github.com/gitpod-io/workspace-images): Ready-to-use Docker images for Gitpod workspaces.
- [OpenVSCode Server](https://github.com/gitpod-io/openvscode-server): Run VS Code in a browser.
- [Gitpod browser extension](https://github.com/gitpod-io/browser-extension): Add a Gitpod button to Git hosting providers.
