# Rx-JSX
Basic example for using JSX with RxJS without React

With a basic router implementation

# Getting started
Install dependencies with `yarn`

Start the app with `yarn start`

For collaborative drawing using sockets, also start the server with `yarn start:server`

# Theory
## Why?
I thought it would be interesting to try using JSX without React, and try to base the application on streams, rather than objects. Though JSX is still a little objecty. The intention for the paradigm is to essentially not use state, but operate functionaly, and derive state at any point that it's needed, sharing pipelines if multiple components rely on similar things.
## Domain Driven Design; Event-Sourcing; CQRS; Reactive
### Separate commands and queries
#### The only way to make changes to anything that might ever be persisted should be through a command in the command file of the corresponding domain directory.
#### The only pipes from command observables should be queries in the adjacent query file.
#### The only subscriptions should be in the application; components and views.
#### Queries should never invoke commands.
#### Commands and queries should have no side effects,
they should only supply the pipes to do useful things,
it is left to the application to actually do stuff (declarative).
Pipes may not be completely stateless, but should be as pure as possible.

## Random other plans
#### Ensure all subscriptions are preceded with a takeUntil as the last item in the pipe before the subscribe
#### Keep non subscription code blocks outside of the JSX files as much as possible
