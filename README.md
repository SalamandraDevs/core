# Salamandra Devs Community Platform Core

`@salamandradevs/core` is the shared record and database foundation used by the Salamandra
Devs Community Platform. It provides a backend-neutral layer for durable records, dataset
provisioning, cursor pagination, and request-scoped execution context.

The package reflects the architecture notes for the Salamandra Devs Community Platform:
domain and application services should depend on small contracts, while database-specific
details remain inside adapters.

## What It Provides

- Database connection contracts for backend lifecycle management.
- CRUD and dataset contracts that can be implemented by different storage backends.
- MongoDB and MySQL adapters for records and dataset provisioning.
- Zod-driven dataset definitions and backend schema conversion hooks.
- A `RecordsHandler` base class that applies tenant scope, record identity, audit metadata,
  and deterministic cursor pagination.
- AsyncLocalStorage execution context for the authenticated actor, tenant, and request id.

## Project Shape

`src/database` contains the persistence contracts, dataset provisioner, and concrete MongoDB
and MySQL adapters. `src/records` contains the base record model and handler used by services
to build tenant-aware record policies. `src/utils` contains the execution-context helpers that
bind service work to the current request or job.

Services such as `@salamandradevs/auth` use Core to keep persistence details out of transport and
application code while still enforcing tenant boundaries close to the record layer.

## Development

```sh
pnpm install
pnpm run check
pnpm run build
```

## Community

This repository is part of the Salamandra Devs Community Platform, a community-developed
effort led by Salamandra Devs and its contributors. Join us on Telegram at
<https://t.me/salamandradevs> to learn, build, ask questions, and have a good time
contributing.

## License

Licensed under the GNU Lesser General Public License v3.0 or later. See
[LICENSE.md](./LICENSE.md).
