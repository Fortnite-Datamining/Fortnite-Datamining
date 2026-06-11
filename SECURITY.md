# Security Policy

If you find a security issue (for example, a way to make the fetch
pipeline execute untrusted input), please report it privately via
[GitHub private vulnerability reporting](../../security/advisories/new)
rather than opening a public issue.

The fetch pipeline processes untrusted JSON from external APIs every 30
minutes inside GitHub Actions with `contents: write`, so injection bugs
in how that data reaches git, Discord, or Twitter are in scope.
