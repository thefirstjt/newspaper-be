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

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    // The newspaper itself: reading the daily edition and acting on it. Every
    // route here requires the reader to be authenticated.
    router
      .group(() => {
        router.get('editions/today', [EditionsController, 'today'])
        router.get('editions/:date', [EditionsController, 'show'])
        router.post('items/:id/rate', [ItemsController, 'rate'])
        router.post('items/:id/discard', [ItemsController, 'discard'])
        router.get('quiz/score', [QuizController, 'score'])
        router.post('quiz/:id/answer', [QuizController, 'answer'])
        router.post('links', [LinksController, 'store'])
        router.post('run-daily', [RunDailyController, 'store'])
        router.get('config/sources', [ConfigController, 'sources'])
        router.get('config/categories', [ConfigController, 'categories'])
        router.get('config/schedule', [ConfigController, 'showSchedule'])
        router.put('config/schedule', [ConfigController, 'updateSchedule'])
        router.get('config/gap-topics', [ConfigController, 'gapTopics'])
        router.put('config/gap-topics', [ConfigController, 'updateGapTopics'])
      })
      .as('newspaper')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
