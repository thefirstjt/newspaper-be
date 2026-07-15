/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

const placeholder: any = {}

const routes = {
  'auth.access_tokens.store': {
    methods: ["POST"],
    pattern: '/api/v1/auth/login',
    tokens: [{"old":"/api/v1/auth/login","type":0,"val":"api","end":""},{"old":"/api/v1/auth/login","type":0,"val":"v1","end":""},{"old":"/api/v1/auth/login","type":0,"val":"auth","end":""},{"old":"/api/v1/auth/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['auth.access_tokens.store']['types'],
  },
  'onboarding.onboarding.invitation': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/onboarding/invitation',
    tokens: [{"old":"/api/v1/onboarding/invitation","type":0,"val":"api","end":""},{"old":"/api/v1/onboarding/invitation","type":0,"val":"v1","end":""},{"old":"/api/v1/onboarding/invitation","type":0,"val":"onboarding","end":""},{"old":"/api/v1/onboarding/invitation","type":0,"val":"invitation","end":""}],
    types: placeholder as Registry['onboarding.onboarding.invitation']['types'],
  },
  'onboarding.onboarding.accept': {
    methods: ["POST"],
    pattern: '/api/v1/onboarding/accept',
    tokens: [{"old":"/api/v1/onboarding/accept","type":0,"val":"api","end":""},{"old":"/api/v1/onboarding/accept","type":0,"val":"v1","end":""},{"old":"/api/v1/onboarding/accept","type":0,"val":"onboarding","end":""},{"old":"/api/v1/onboarding/accept","type":0,"val":"accept","end":""}],
    types: placeholder as Registry['onboarding.onboarding.accept']['types'],
  },
  'onboarding.onboarding.categories': {
    methods: ["POST"],
    pattern: '/api/v1/onboarding/categories',
    tokens: [{"old":"/api/v1/onboarding/categories","type":0,"val":"api","end":""},{"old":"/api/v1/onboarding/categories","type":0,"val":"v1","end":""},{"old":"/api/v1/onboarding/categories","type":0,"val":"onboarding","end":""},{"old":"/api/v1/onboarding/categories","type":0,"val":"categories","end":""}],
    types: placeholder as Registry['onboarding.onboarding.categories']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [{"old":"/api/v1/account/profile","type":0,"val":"api","end":""},{"old":"/api/v1/account/profile","type":0,"val":"v1","end":""},{"old":"/api/v1/account/profile","type":0,"val":"account","end":""},{"old":"/api/v1/account/profile","type":0,"val":"profile","end":""}],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [{"old":"/api/v1/account/logout","type":0,"val":"api","end":""},{"old":"/api/v1/account/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/account/logout","type":0,"val":"account","end":""},{"old":"/api/v1/account/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'admin.admin_sessions.store': {
    methods: ["POST"],
    pattern: '/api/v1/admin/login',
    tokens: [{"old":"/api/v1/admin/login","type":0,"val":"api","end":""},{"old":"/api/v1/admin/login","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/login","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/login","type":0,"val":"login","end":""}],
    types: placeholder as Registry['admin.admin_sessions.store']['types'],
  },
  'admin.admin_sessions.me': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/me',
    tokens: [{"old":"/api/v1/admin/me","type":0,"val":"api","end":""},{"old":"/api/v1/admin/me","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/me","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/me","type":0,"val":"me","end":""}],
    types: placeholder as Registry['admin.admin_sessions.me']['types'],
  },
  'admin.admin_sessions.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/admin/logout',
    tokens: [{"old":"/api/v1/admin/logout","type":0,"val":"api","end":""},{"old":"/api/v1/admin/logout","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/logout","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/logout","type":0,"val":"logout","end":""}],
    types: placeholder as Registry['admin.admin_sessions.destroy']['types'],
  },
  'admin.admin_invitations.store': {
    methods: ["POST"],
    pattern: '/api/v1/admin/invitations',
    tokens: [{"old":"/api/v1/admin/invitations","type":0,"val":"api","end":""},{"old":"/api/v1/admin/invitations","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/invitations","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/invitations","type":0,"val":"invitations","end":""}],
    types: placeholder as Registry['admin.admin_invitations.store']['types'],
  },
  'admin.admin_invitations.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/invitations',
    tokens: [{"old":"/api/v1/admin/invitations","type":0,"val":"api","end":""},{"old":"/api/v1/admin/invitations","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/invitations","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/invitations","type":0,"val":"invitations","end":""}],
    types: placeholder as Registry['admin.admin_invitations.index']['types'],
  },
  'admin.admin_users.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/admin/users',
    tokens: [{"old":"/api/v1/admin/users","type":0,"val":"api","end":""},{"old":"/api/v1/admin/users","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/users","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/users","type":0,"val":"users","end":""}],
    types: placeholder as Registry['admin.admin_users.index']['types'],
  },
  'admin.admin_users.toggle_status': {
    methods: ["POST"],
    pattern: '/api/v1/admin/users/:id/toggle-status',
    tokens: [{"old":"/api/v1/admin/users/:id/toggle-status","type":0,"val":"api","end":""},{"old":"/api/v1/admin/users/:id/toggle-status","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/users/:id/toggle-status","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/users/:id/toggle-status","type":0,"val":"users","end":""},{"old":"/api/v1/admin/users/:id/toggle-status","type":1,"val":"id","end":""},{"old":"/api/v1/admin/users/:id/toggle-status","type":0,"val":"toggle-status","end":""}],
    types: placeholder as Registry['admin.admin_users.toggle_status']['types'],
  },
  'admin.admin_users.send_edition': {
    methods: ["POST"],
    pattern: '/api/v1/admin/users/:id/send-edition',
    tokens: [{"old":"/api/v1/admin/users/:id/send-edition","type":0,"val":"api","end":""},{"old":"/api/v1/admin/users/:id/send-edition","type":0,"val":"v1","end":""},{"old":"/api/v1/admin/users/:id/send-edition","type":0,"val":"admin","end":""},{"old":"/api/v1/admin/users/:id/send-edition","type":0,"val":"users","end":""},{"old":"/api/v1/admin/users/:id/send-edition","type":1,"val":"id","end":""},{"old":"/api/v1/admin/users/:id/send-edition","type":0,"val":"send-edition","end":""}],
    types: placeholder as Registry['admin.admin_users.send_edition']['types'],
  },
  'newspaper.editions.today': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/editions/today',
    tokens: [{"old":"/api/v1/editions/today","type":0,"val":"api","end":""},{"old":"/api/v1/editions/today","type":0,"val":"v1","end":""},{"old":"/api/v1/editions/today","type":0,"val":"editions","end":""},{"old":"/api/v1/editions/today","type":0,"val":"today","end":""}],
    types: placeholder as Registry['newspaper.editions.today']['types'],
  },
  'newspaper.editions.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/editions/:date',
    tokens: [{"old":"/api/v1/editions/:date","type":0,"val":"api","end":""},{"old":"/api/v1/editions/:date","type":0,"val":"v1","end":""},{"old":"/api/v1/editions/:date","type":0,"val":"editions","end":""},{"old":"/api/v1/editions/:date","type":1,"val":"date","end":""}],
    types: placeholder as Registry['newspaper.editions.show']['types'],
  },
  'newspaper.items.rate': {
    methods: ["POST"],
    pattern: '/api/v1/items/:id/rate',
    tokens: [{"old":"/api/v1/items/:id/rate","type":0,"val":"api","end":""},{"old":"/api/v1/items/:id/rate","type":0,"val":"v1","end":""},{"old":"/api/v1/items/:id/rate","type":0,"val":"items","end":""},{"old":"/api/v1/items/:id/rate","type":1,"val":"id","end":""},{"old":"/api/v1/items/:id/rate","type":0,"val":"rate","end":""}],
    types: placeholder as Registry['newspaper.items.rate']['types'],
  },
  'newspaper.items.discard': {
    methods: ["POST"],
    pattern: '/api/v1/items/:id/discard',
    tokens: [{"old":"/api/v1/items/:id/discard","type":0,"val":"api","end":""},{"old":"/api/v1/items/:id/discard","type":0,"val":"v1","end":""},{"old":"/api/v1/items/:id/discard","type":0,"val":"items","end":""},{"old":"/api/v1/items/:id/discard","type":1,"val":"id","end":""},{"old":"/api/v1/items/:id/discard","type":0,"val":"discard","end":""}],
    types: placeholder as Registry['newspaper.items.discard']['types'],
  },
  'newspaper.quiz.score': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/quiz/score',
    tokens: [{"old":"/api/v1/quiz/score","type":0,"val":"api","end":""},{"old":"/api/v1/quiz/score","type":0,"val":"v1","end":""},{"old":"/api/v1/quiz/score","type":0,"val":"quiz","end":""},{"old":"/api/v1/quiz/score","type":0,"val":"score","end":""}],
    types: placeholder as Registry['newspaper.quiz.score']['types'],
  },
  'newspaper.quiz.answer': {
    methods: ["POST"],
    pattern: '/api/v1/quiz/:id/answer',
    tokens: [{"old":"/api/v1/quiz/:id/answer","type":0,"val":"api","end":""},{"old":"/api/v1/quiz/:id/answer","type":0,"val":"v1","end":""},{"old":"/api/v1/quiz/:id/answer","type":0,"val":"quiz","end":""},{"old":"/api/v1/quiz/:id/answer","type":1,"val":"id","end":""},{"old":"/api/v1/quiz/:id/answer","type":0,"val":"answer","end":""}],
    types: placeholder as Registry['newspaper.quiz.answer']['types'],
  },
  'newspaper.links.store': {
    methods: ["POST"],
    pattern: '/api/v1/links',
    tokens: [{"old":"/api/v1/links","type":0,"val":"api","end":""},{"old":"/api/v1/links","type":0,"val":"v1","end":""},{"old":"/api/v1/links","type":0,"val":"links","end":""}],
    types: placeholder as Registry['newspaper.links.store']['types'],
  },
  'newspaper.persona.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/persona',
    tokens: [{"old":"/api/v1/persona","type":0,"val":"api","end":""},{"old":"/api/v1/persona","type":0,"val":"v1","end":""},{"old":"/api/v1/persona","type":0,"val":"persona","end":""}],
    types: placeholder as Registry['newspaper.persona.show']['types'],
  },
  'newspaper.persona.update': {
    methods: ["PUT"],
    pattern: '/api/v1/persona',
    tokens: [{"old":"/api/v1/persona","type":0,"val":"api","end":""},{"old":"/api/v1/persona","type":0,"val":"v1","end":""},{"old":"/api/v1/persona","type":0,"val":"persona","end":""}],
    types: placeholder as Registry['newspaper.persona.update']['types'],
  },
  'newspaper.persona.generate': {
    methods: ["POST"],
    pattern: '/api/v1/persona/generate',
    tokens: [{"old":"/api/v1/persona/generate","type":0,"val":"api","end":""},{"old":"/api/v1/persona/generate","type":0,"val":"v1","end":""},{"old":"/api/v1/persona/generate","type":0,"val":"persona","end":""},{"old":"/api/v1/persona/generate","type":0,"val":"generate","end":""}],
    types: placeholder as Registry['newspaper.persona.generate']['types'],
  },
  'newspaper.run_daily.store': {
    methods: ["POST"],
    pattern: '/api/v1/run-daily',
    tokens: [{"old":"/api/v1/run-daily","type":0,"val":"api","end":""},{"old":"/api/v1/run-daily","type":0,"val":"v1","end":""},{"old":"/api/v1/run-daily","type":0,"val":"run-daily","end":""}],
    types: placeholder as Registry['newspaper.run_daily.store']['types'],
  },
  'newspaper.categories.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/config/categories',
    tokens: [{"old":"/api/v1/config/categories","type":0,"val":"api","end":""},{"old":"/api/v1/config/categories","type":0,"val":"v1","end":""},{"old":"/api/v1/config/categories","type":0,"val":"config","end":""},{"old":"/api/v1/config/categories","type":0,"val":"categories","end":""}],
    types: placeholder as Registry['newspaper.categories.index']['types'],
  },
  'newspaper.categories.store': {
    methods: ["POST"],
    pattern: '/api/v1/config/categories',
    tokens: [{"old":"/api/v1/config/categories","type":0,"val":"api","end":""},{"old":"/api/v1/config/categories","type":0,"val":"v1","end":""},{"old":"/api/v1/config/categories","type":0,"val":"config","end":""},{"old":"/api/v1/config/categories","type":0,"val":"categories","end":""}],
    types: placeholder as Registry['newspaper.categories.store']['types'],
  },
  'newspaper.categories.update': {
    methods: ["PUT"],
    pattern: '/api/v1/config/categories/:id',
    tokens: [{"old":"/api/v1/config/categories/:id","type":0,"val":"api","end":""},{"old":"/api/v1/config/categories/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/config/categories/:id","type":0,"val":"config","end":""},{"old":"/api/v1/config/categories/:id","type":0,"val":"categories","end":""},{"old":"/api/v1/config/categories/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['newspaper.categories.update']['types'],
  },
  'newspaper.categories.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/config/categories/:id',
    tokens: [{"old":"/api/v1/config/categories/:id","type":0,"val":"api","end":""},{"old":"/api/v1/config/categories/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/config/categories/:id","type":0,"val":"config","end":""},{"old":"/api/v1/config/categories/:id","type":0,"val":"categories","end":""},{"old":"/api/v1/config/categories/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['newspaper.categories.destroy']['types'],
  },
  'newspaper.sources.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/config/sources',
    tokens: [{"old":"/api/v1/config/sources","type":0,"val":"api","end":""},{"old":"/api/v1/config/sources","type":0,"val":"v1","end":""},{"old":"/api/v1/config/sources","type":0,"val":"config","end":""},{"old":"/api/v1/config/sources","type":0,"val":"sources","end":""}],
    types: placeholder as Registry['newspaper.sources.index']['types'],
  },
  'newspaper.sources.store': {
    methods: ["POST"],
    pattern: '/api/v1/config/sources',
    tokens: [{"old":"/api/v1/config/sources","type":0,"val":"api","end":""},{"old":"/api/v1/config/sources","type":0,"val":"v1","end":""},{"old":"/api/v1/config/sources","type":0,"val":"config","end":""},{"old":"/api/v1/config/sources","type":0,"val":"sources","end":""}],
    types: placeholder as Registry['newspaper.sources.store']['types'],
  },
  'newspaper.sources.update': {
    methods: ["PUT"],
    pattern: '/api/v1/config/sources/:id',
    tokens: [{"old":"/api/v1/config/sources/:id","type":0,"val":"api","end":""},{"old":"/api/v1/config/sources/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/config/sources/:id","type":0,"val":"config","end":""},{"old":"/api/v1/config/sources/:id","type":0,"val":"sources","end":""},{"old":"/api/v1/config/sources/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['newspaper.sources.update']['types'],
  },
  'newspaper.sources.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/config/sources/:id',
    tokens: [{"old":"/api/v1/config/sources/:id","type":0,"val":"api","end":""},{"old":"/api/v1/config/sources/:id","type":0,"val":"v1","end":""},{"old":"/api/v1/config/sources/:id","type":0,"val":"config","end":""},{"old":"/api/v1/config/sources/:id","type":0,"val":"sources","end":""},{"old":"/api/v1/config/sources/:id","type":1,"val":"id","end":""}],
    types: placeholder as Registry['newspaper.sources.destroy']['types'],
  },
  'newspaper.config.show_schedule': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/config/schedule',
    tokens: [{"old":"/api/v1/config/schedule","type":0,"val":"api","end":""},{"old":"/api/v1/config/schedule","type":0,"val":"v1","end":""},{"old":"/api/v1/config/schedule","type":0,"val":"config","end":""},{"old":"/api/v1/config/schedule","type":0,"val":"schedule","end":""}],
    types: placeholder as Registry['newspaper.config.show_schedule']['types'],
  },
  'newspaper.config.update_schedule': {
    methods: ["PUT"],
    pattern: '/api/v1/config/schedule',
    tokens: [{"old":"/api/v1/config/schedule","type":0,"val":"api","end":""},{"old":"/api/v1/config/schedule","type":0,"val":"v1","end":""},{"old":"/api/v1/config/schedule","type":0,"val":"config","end":""},{"old":"/api/v1/config/schedule","type":0,"val":"schedule","end":""}],
    types: placeholder as Registry['newspaper.config.update_schedule']['types'],
  },
  'newspaper.config.gap_topics': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/config/gap-topics',
    tokens: [{"old":"/api/v1/config/gap-topics","type":0,"val":"api","end":""},{"old":"/api/v1/config/gap-topics","type":0,"val":"v1","end":""},{"old":"/api/v1/config/gap-topics","type":0,"val":"config","end":""},{"old":"/api/v1/config/gap-topics","type":0,"val":"gap-topics","end":""}],
    types: placeholder as Registry['newspaper.config.gap_topics']['types'],
  },
  'newspaper.config.update_gap_topics': {
    methods: ["PUT"],
    pattern: '/api/v1/config/gap-topics',
    tokens: [{"old":"/api/v1/config/gap-topics","type":0,"val":"api","end":""},{"old":"/api/v1/config/gap-topics","type":0,"val":"v1","end":""},{"old":"/api/v1/config/gap-topics","type":0,"val":"config","end":""},{"old":"/api/v1/config/gap-topics","type":0,"val":"gap-topics","end":""}],
    types: placeholder as Registry['newspaper.config.update_gap_topics']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
