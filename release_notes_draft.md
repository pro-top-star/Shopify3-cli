<!--
If your feature is significant enough that CLI users will want to know about it,
write a short summary sentence here. This is a draft document and will be
finalized when a new minor version is released.

Notes should look like this:

# App

* ***A cool thing.*** Rather than doing the annoying thing you used to do, you can
now do a different and much cooler thing.
* ***A faster thing.*** The `command` command was sped up by 3x in most cases.

# Theme

* ***Another cool thing.*** You get the idea by now.
-->

# App

* ***JS functions.*** JavaScript functions are now available! You can learn more
in the docs: https://shopify.dev/docs/apps/functions/language-support/javascript
* ***Custom ports for `app dev`.*** You can now define custom ports for the
frontend or backend processes of the app. Just specify a number for `port` in
your `shopify.web.toml` file.
* ***Theme app extension logs.*** Logs for theme app extensions will no longer
appear in a separate area and conflict with other logs or the preview/quit bar.
Instead, they will be integrated with the other logs. Progress bars are
replaced with static output to accommodate this placement.
* ***Theme app extension excluding system files.*** System files like `Thumbs.db`
or `.DS_STORE` will now be excluded from theme app extension builds, just like
they are excluded from themes.
* ***Customer accounts UI extension preview.*** The link from the dev console for
Customer Accounts UI Extensions will now redirect to the customer account page.

# Theme

* ***Theme environments.*** You can configure environments with theme and store
in a `shopify.theme.toml` file in your project root. Use the `--environment`
flag (or `-e` for short) to switch between environments. For more details, read
the docs at https://shopify.dev/docs/themes/tools/cli/environments
* ***Fix: Clean up errors on theme dev.*** Analytics requests were causing many
errors in both the CLI and Chrome consoles. These requests are now stubbed out.
* ***Fix: 422 error on theme dev.*** Development theme names are now truncated
to ≤ 50 characters, preventing a 422 error.
* ***Fix: `Ruby is required to continue`.*** An error condition where the CLI
can't find the ruby executable is solved.
* ***Fix: gem install permissions issues.*** The CLI now uses a local directory
for gem installations, avoiding permissions issues users experienced previously
when installing to their system gem directory.

# UI (applicable across project types)

* ***Resizable select prompts.*** The height of select prompts adjusts to the
height of the terminal, so that prompts won't be cut off in shorter terminals.
* ***Fix: Log output utf8 support.*** Special characters were appearing
strangely in subprocess logs. Now they are correctly rendered using utf8.
* ***Fix: Duplicated taskbar.*** Return key presses were causing the rainbow
taskbar to be duplicated. Now the CLI swallows the keypress, preventing this
visual distraction.
* ***Fix: Dev footer duplicates on resize.*** The persistent footer for `app dev`
would self-duplicate on terminal window resize. It is now displayed correctly.
* ***Fix: Narrow terminal support.*** Previously, certain UI elements would look
strange in very narrow terminals, such as in CI tools. Now the CLI treats any
terminal as though at least 20 characters' width is available, resulting in
output which is much easier to read.
