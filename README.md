# Coral

A lightweight starter framework for building BigCommerce Stencil themes with island architecture.

## Theme baseline

Coral starts from the smallest private Stencil theme that `stencil bundle` accepts:

- `config.json` defines theme metadata and the default variation.
- `templates/pages/home.html` provides the first server-rendered page template.
- `lang/en.json` keeps the language directory valid and tracked.
- `stencil.conf.cjs` is the CLI build hook; it stays no-op until an asset pipeline is needed.
- `config.stencil.json` points local Stencil CLI runs at the sandbox store.

The OAuth token is stored in ignored `secrets.stencil.json`; do not commit it.

Validate packaging with:

```sh
stencil bundle
```

Run the local storefront with:

```sh
stencil start
```
