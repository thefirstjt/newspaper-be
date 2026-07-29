/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

const EditionsController = () => import('#controllers/editions_controller')
const ItemsController = () => import('#controllers/items_controller')
const QuizController = () => import('#controllers/quiz_controller')
const LinksController = () => import('#controllers/links_controller')
const RunDailyController = () => import('#controllers/run_daily_controller')
const ConfigController = () => import('#controllers/config_controller')
const CategoriesController = () => import('#controllers/categories_controller')
const SourcesController = () => import('#controllers/sources_controller')
const PersonaController = () => import('#controllers/persona_controller')
const AdminSessionsController = () => import('#controllers/admin/sessions_controller')
const AdminInvitationsController = () => import('#controllers/admin/invitations_controller')
const AdminUsersController = () => import('#controllers/admin/users_controller')
const OnboardingController = () => import('#controllers/onboarding_controller')

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    // Reader onboarding via an invitation's magic link (stage 1). Both routes
    // are open — the invitation token is the credential.
    router
      .group(() => {
        router.get('invitation', [OnboardingController, 'invitation'])
        router.post('accept', [OnboardingController, 'accept'])
        // Stage 3 needs the reader authenticated (they logged in at accept).
        router
          .group(() => {
            router.post('categories', [OnboardingController, 'categories'])
            router.put('step', [OnboardingController, 'step'])
          })
          .use(middleware.auth())
      })
      .prefix('onboarding')
      .as('onboarding')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    // The admin area: login is open; everything else needs an admin token.
    router
      .group(() => {
        router.post('login', [AdminSessionsController, 'store'])
        router
          .group(() => {
            router.get('me', [AdminSessionsController, 'me'])
            router.post('logout', [AdminSessionsController, 'destroy'])
            router.post('reset-password', [AdminSessionsController, 'resetPassword'])
            router.post('invitations', [AdminInvitationsController, 'store'])
            router.get('invitations', [AdminInvitationsController, 'index'])
            router.post('invitations/:id/resend', [AdminInvitationsController, 'resend'])
            router.get('users', [AdminUsersController, 'index'])
            router.post('users/:id/toggle-status', [AdminUsersController, 'toggleStatus'])
            router.post('users/:id/send-edition', [AdminUsersController, 'sendEdition'])
            router.post('users/:id/rebuild-edition', [AdminUsersController, 'rebuildEdition'])
          })
          .use(middleware.auth({ guards: ['admin'] }))
      })
      .prefix('admin')
      .as('admin')

    // The newspaper itself: reading the daily edition and acting on it. Every
    // route here requires the reader to be authenticated.
    router
      .group(() => {
        router.get('editions/today', [EditionsController, 'today'])
        router.get('editions/:date', [EditionsController, 'show'])
        router.get('items/search', [ItemsController, 'search'])
        router.post('items/:id/rate', [ItemsController, 'rate'])
        router.post('items/:id/discard', [ItemsController, 'discard'])
        router.get('quiz/score', [QuizController, 'score'])
        router.post('quiz/:id/answer', [QuizController, 'answer'])
        router.post('links', [LinksController, 'store'])
        router.get('persona', [PersonaController, 'show'])
        router.put('persona', [PersonaController, 'update'])
        router.post('persona/generate', [PersonaController, 'generate'])
        router.post('run-daily', [RunDailyController, 'store'])

        router.get('config/categories', [CategoriesController, 'index'])
        router.post('config/categories', [CategoriesController, 'store'])
        router.put('config/categories/:id', [CategoriesController, 'update'])
        router.delete('config/categories/:id', [CategoriesController, 'destroy'])

        router.get('config/sources', [SourcesController, 'index'])
        router.post('config/sources', [SourcesController, 'store'])
        router.put('config/sources/:id', [SourcesController, 'update'])
        router.delete('config/sources/:id', [SourcesController, 'destroy'])

        router.get('config/schedule', [ConfigController, 'showSchedule'])
        router.put('config/schedule', [ConfigController, 'updateSchedule'])
        router.get('config/gap-topics', [ConfigController, 'gapTopics'])
        router.put('config/gap-topics', [ConfigController, 'updateGapTopics'])
      })
      .as('newspaper')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
