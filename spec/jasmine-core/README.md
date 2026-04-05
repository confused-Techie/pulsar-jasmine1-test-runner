These spec files are copied from v1.3.1 of [`jasmine/jasmine`](https://github.com/jasmine/jasmine/tree/v1.3.1/spec).

Since unfortunately the specs authored by `kevinsawicki` (which are copied from `mhevery`) rely on failures
and custom scripts to run and see failures.

Hopefully jasmine's specs are not the same and can just be run cleanly.

---

In this spec suite you may see some specs commented out with:
`NOTE: Skipped due to incompatibility with Pulsar's Jasmine 1.3.1`

The reason you may see this is because these specs are pulled from Jasmine mainline.

But the thing is, Pulsar's Jasmine suite is `kevinsawicki`s, which was forked from `mhevery`, which itself was an original creation, just based off Jasmine as an idea, since Jasmine didn't at the time exist for NodeJS.

What this means, is this spec suite has never been run against Pulsar, and considering the codebase was made
by totally different people, it's not exactly expected that all tests will pass. But I pulled these specs in as it seemed the most confident way to test our jasmine most completely.

So that comment preceding a skipped test means it doesn't work on this codebase, nor does it work on the current Pulsar Jasmine runner, otherwise it's never worked, and that's okay. We only want to ensure we don't break things between this codebase and the current Pulsar jasmine runner.
