/*
|--------------------------------------------------------------------------
| Transmit channel authorization
|--------------------------------------------------------------------------
|
| Defines who may subscribe to which server-sent-event channels. The silent
| auth middleware runs on every request, so a bearer token on the subscribe
| request populates `auth.user` here.
|
*/

import transmit from '@adonisjs/transmit/services/main'

// Register the SSE endpoints (__transmit/events, /subscribe, /unsubscribe). The
// global silent-auth middleware runs on them, so a bearer token on the subscribe
// request populates `auth.user` for the channel checks below.
transmit.registerRoutes()

/**
 * A reader's onboarding category generation is private to them: only the
 * authenticated reader whose id is in the channel may listen.
 */
transmit.authorize<{ userId: string }>('users/:userId/onboarding/categories', (ctx, { userId }) => {
  return ctx.auth.user?.id === userId
})

/**
 * A reader's daily edition builds are private to them: only the authenticated
 * reader whose id is in the channel may listen.
 */
transmit.authorize<{ userId: string }>('users/:userId/editions', (ctx, { userId }) => {
  return ctx.auth.user?.id === userId
})
