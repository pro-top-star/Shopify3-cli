# Release process

## Process

### Adding change sets when opening PRs

When changing any of the packages of the repository,
you'll have to run `yarn changeset add`,
and [changesets](https://github.com/changesets/changesets) will guide you through the process of adding your changes to be included in the next version's changelog.
Note that if you skip this step when you open a PR,
CI will fail and prevent you from merging the PR.

### Creating a new version
The steps are:
1. Locate the [opened PR](https://github.com/Shopify/cli/pulls?q=is%3Apr+is%3Aopen+%22Version+Packages%22+) named **Version Packages**. This PR is automatically created with the first merge in main after a previous release is published. _Changesets_ will automatically detect changes with each merge to main and update automatically the PR and consequently the package.jsons and the dependencies between them
2. Sanity-check and merge the **Version Packages** PR
3. Wait until the commit for **Version Packages** becomes <font color="gree">green</font> in [CLI Production Shipit](https://shipit.shopify.io/shopify/cli/production) and push the _Deploy_ button.
4. Push again on the _Create deploy_ button to start the deployment. Two main tasks are executed:
    1. Creation of the [extensions binary release](https://github.com/Shopify/cli/releases) in Github. In case an error occurs at this step, there are two possible situations:
       * The release is not created: Retry again from _step 3_
       * Some of the binaries are not correctly upload to the release: The release should be deleted manually from Github and then  retry again from _step 3_
    2. Registration of the new CLI version in the  [NPM registry](https://www.npmjs.com/package/@shopify/cli). In case an error is produced the extension binary release should be deleted manually from Github and retry again from _step 3_

