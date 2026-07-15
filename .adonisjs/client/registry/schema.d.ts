/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractResponse } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.access_tokens.store': {
    methods: ["POST"]
    pattern: '/api/v1/auth/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'onboarding.onboarding.invitation': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/onboarding/invitation'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['invitation']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['invitation']>>>
    }
  }
  'onboarding.onboarding.accept': {
    methods: ["POST"]
    pattern: '/api/v1/onboarding/accept'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/onboarding').acceptInvitationValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/onboarding').acceptInvitationValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['accept']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['accept']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'onboarding.onboarding.categories': {
    methods: ["POST"]
    pattern: '/api/v1/onboarding/categories'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/onboarding').onboardingCategoriesValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/onboarding').onboardingCategoriesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['categories']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/onboarding_controller').default['categories']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'admin.admin_sessions.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/admin').adminLoginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/admin').adminLoginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/sessions_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/sessions_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.admin_sessions.me': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/me'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/sessions_controller').default['me']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/sessions_controller').default['me']>>>
    }
  }
  'admin.admin_sessions.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/admin/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/sessions_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/sessions_controller').default['destroy']>>>
    }
  }
  'admin.admin_invitations.store': {
    methods: ["POST"]
    pattern: '/api/v1/admin/invitations'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/invitation').createInvitationsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/invitation').createInvitationsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/invitations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/invitations_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'admin.admin_invitations.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/invitations'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/invitations_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/invitations_controller').default['index']>>>
    }
  }
  'admin.admin_users.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/admin/users'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['index']>>>
    }
  }
  'admin.admin_users.toggle_status': {
    methods: ["POST"]
    pattern: '/api/v1/admin/users/:id/toggle-status'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['toggleStatus']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/admin/users_controller').default['toggleStatus']>>>
    }
  }
  'newspaper.editions.today': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/editions/today'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editions_controller').default['today']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editions_controller').default['today']>>>
    }
  }
  'newspaper.editions.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/editions/:date'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { date: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/editions_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/editions_controller').default['show']>>>
    }
  }
  'newspaper.items.rate': {
    methods: ["POST"]
    pattern: '/api/v1/items/:id/rate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/newspaper').rateValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/newspaper').rateValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/items_controller').default['rate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/items_controller').default['rate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspaper.items.discard': {
    methods: ["POST"]
    pattern: '/api/v1/items/:id/discard'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/items_controller').default['discard']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/items_controller').default['discard']>>>
    }
  }
  'newspaper.quiz.score': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/quiz/score'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/quiz_controller').default['score']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/quiz_controller').default['score']>>>
    }
  }
  'newspaper.quiz.answer': {
    methods: ["POST"]
    pattern: '/api/v1/quiz/:id/answer'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/newspaper').answerValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/newspaper').answerValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/quiz_controller').default['answer']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/quiz_controller').default['answer']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspaper.links.store': {
    methods: ["POST"]
    pattern: '/api/v1/links'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/newspaper').submitLinkValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/newspaper').submitLinkValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/links_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/links_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspaper.persona.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/persona'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/persona_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/persona_controller').default['show']>>>
    }
  }
  'newspaper.persona.update': {
    methods: ["PUT"]
    pattern: '/api/v1/persona'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/persona').personaContentValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/persona').personaContentValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/persona_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/persona_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspaper.persona.generate': {
    methods: ["POST"]
    pattern: '/api/v1/persona/generate'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/persona').personaValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/persona').personaValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/persona_controller').default['generate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/persona_controller').default['generate']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspaper.run_daily.store': {
    methods: ["POST"]
    pattern: '/api/v1/run-daily'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/run_daily_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/run_daily_controller').default['store']>>>
    }
  }
  'newspaper.categories.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/config/categories'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/categories_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/categories_controller').default['index']>>>
    }
  }
  'newspaper.categories.store': {
    methods: ["POST"]
    pattern: '/api/v1/config/categories'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category').createCategoryValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/category').createCategoryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/categories_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/categories_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspaper.categories.update': {
    methods: ["PUT"]
    pattern: '/api/v1/config/categories/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/category').updateCategoryValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/category').updateCategoryValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/categories_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/categories_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspaper.categories.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/config/categories/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/categories_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/categories_controller').default['destroy']>>>
    }
  }
  'newspaper.sources.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/config/sources'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sources_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sources_controller').default['index']>>>
    }
  }
  'newspaper.sources.store': {
    methods: ["POST"]
    pattern: '/api/v1/config/sources'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/source').createSourceValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/source').createSourceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sources_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sources_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspaper.sources.update': {
    methods: ["PUT"]
    pattern: '/api/v1/config/sources/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/source').updateSourceValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/source').updateSourceValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sources_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sources_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspaper.sources.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/config/sources/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/sources_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/sources_controller').default['destroy']>>>
    }
  }
  'newspaper.config.show_schedule': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/config/schedule'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/config_controller').default['showSchedule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/config_controller').default['showSchedule']>>>
    }
  }
  'newspaper.config.update_schedule': {
    methods: ["PUT"]
    pattern: '/api/v1/config/schedule'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/config').scheduleValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/config').scheduleValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/config_controller').default['updateSchedule']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/config_controller').default['updateSchedule']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'newspaper.config.gap_topics': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/config/gap-topics'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/config_controller').default['gapTopics']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/config_controller').default['gapTopics']>>>
    }
  }
  'newspaper.config.update_gap_topics': {
    methods: ["PUT"]
    pattern: '/api/v1/config/gap-topics'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/config').gapTopicsValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/config').gapTopicsValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/config_controller').default['updateGapTopics']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/config_controller').default['updateGapTopics']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
}
