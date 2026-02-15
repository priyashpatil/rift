---
title: "Ruby on Rails Dev Servers"
description: "Configure Rails and Rack dev servers to use worktree-specific ports."
weight: 14
---

When multiple Rift worktrees run dev servers simultaneously, they all compete for the same default port. The fix: use the [bootstrap pattern](/hooks/#the-bootstrap-pattern) to write a deterministic `PORT` to `.env` for each worktree, then configure your server to read it.

## Rails

Rails reads the `PORT` environment variable automatically. Pass it explicitly:

```bash
bin/rails server -p ${PORT:-3000}
```

### Using dotenv-rails

The [`dotenv-rails`](https://github.com/bkeepers/dotenv) gem loads `.env` automatically in development. Add it to your `Gemfile`:

```ruby
gem "dotenv-rails", groups: [:development, :test]
```

```bash
bundle install
```

With `dotenv-rails` installed, Rails picks up `PORT` from `.env` on startup — no `source` needed:

```bash
bin/rails server
```

### Puma config

If you use Puma (the Rails default), you can set the port in `config/puma.rb`:

```ruby
port ENV.fetch("PORT", 3000)
```

This is already the default in most Rails apps generated with Rails 7+.

## Sinatra

```ruby
require "sinatra"
require "dotenv/load"

set :port, ENV.fetch("PORT", "4567").to_i
```

## Rack

Any Rack-based server reads `PORT` the same way:

```ruby
require "dotenv/load" # gem install dotenv

port = ENV.fetch("PORT", "9292").to_i

Rack::Handler::Puma.run(app, Port: port)
```

## rift.yaml

`rift init` can set up the bootstrap hooks for you. If you prefer to configure them manually, here's an example using a bash script:

```yaml
hooks:
  open: "bash scripts/bootstrap.sh && bundle install"
  jump: "bash scripts/bootstrap.sh"
```

The hook command can be anything — `bash scripts/bootstrap.sh`, `bundle exec rake bootstrap`, `ruby scripts/setup.rb`, etc. See [Hooks](/hooks/#the-bootstrap-pattern) for details.
