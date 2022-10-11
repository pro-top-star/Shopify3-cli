# Cross-OS compatibility

The CLI must support Windows, Linux, and macOS.
Supporting the three OSs has implications in how the code is written and tested. This document includes some guidelines to ensure the CLI works reliably across OS and that we don't introduce regressions.

## Developing

### Use `@shopify/cli-kit` modules

Unlike programming languages like Rust or Go, whose standard library work more consistently across OS, that's not the case with the Node runtime in which the CLI runs. Consequently, packages like [cross-zip](https://www.npmjs.com/package/cross-zip), [execa](https://www.npmjs.com/package/execa), or [pathe](https://www.npmjs.com/package/pathe) in the NPM ecosystem provide a cross-OS-compatible version of the Node APIs. `@shopify/cli-kit` exports modules like system or file that abstract away the usage of those packages, and **thus CLI features must use those modules over the ones provided by Node**. Using `@shopify/cli-kit` modules also eases rolling out fixes, improvements, and optimizations because all features go through the same set of APIs we control.

## Testing

### Automated testing

When implementing business logic that interacts with the OS, for example doing IO operations like creating a Git repository or Zipping a folder, **we strongly recommend writing a unit test that doesn't mock the interactions with the OS**. Those tests will run on Windows, Linux, and macOS on CI and surface any incompatibilities with the OS.


### Manual testing

Please don't assume that a successful working workflow in the OS in which it was developed will yield success in other OSs. **We strongly recommend manually testing the workflow in other OSs**. If you don't have a computer with a given OS, here are some recommendations to virtualize the environment:

#### Linux ([Podman](https://podman.io/))

Run the following command from the CLI directory to create an temporary virtual Linux environment with the directory mounted in it:

```bash
podman run \
  --rm --interactive --tty \
  --volume "$(pwd):/src" \
  --workdir "/src" \
  node:18 \
  /bin/bash
```

Then run `yarn install` to resolve and pull all the project dependencies into the environment.


#### Windows ([Parallels](https://www.parallels.com/pd/general/))

After you've installed Parallels and virtualized the Windows environment, go to `Actions > Configure > Options (Tab) > Sharing > Share Custom Mac folders with Windows` and share the folder containing the CLI repository. Then open the coherence mode through `View > Enter Coherence`. The coherence mode will show Windows' windows as if they were part of the host. You might need to run `yarn install` from the Windows shell to ensure dependencies with native extensions pull the binaries for the Windows architecture. You might also need to run the following command if Yarn throws errors related to unsigned scripts:

```bash
Set-ExecutionPolicy Unrestricted -Scope LocalMachine
```



