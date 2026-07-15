import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'onboarding.onboarding.invitation': { paramsTuple?: []; params?: {} }
    'onboarding.onboarding.accept': { paramsTuple?: []; params?: {} }
    'onboarding.onboarding.categories': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'admin.admin_sessions.store': { paramsTuple?: []; params?: {} }
    'admin.admin_sessions.me': { paramsTuple?: []; params?: {} }
    'admin.admin_sessions.destroy': { paramsTuple?: []; params?: {} }
    'admin.admin_sessions.reset_password': { paramsTuple?: []; params?: {} }
    'admin.admin_invitations.store': { paramsTuple?: []; params?: {} }
    'admin.admin_invitations.index': { paramsTuple?: []; params?: {} }
    'admin.admin_invitations.resend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.admin_users.index': { paramsTuple?: []; params?: {} }
    'admin.admin_users.toggle_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.admin_users.send_edition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.editions.today': { paramsTuple?: []; params?: {} }
    'newspaper.editions.show': { paramsTuple: [ParamValue]; params: {'date': ParamValue} }
    'newspaper.items.rate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.items.discard': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.quiz.score': { paramsTuple?: []; params?: {} }
    'newspaper.quiz.answer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.links.store': { paramsTuple?: []; params?: {} }
    'newspaper.persona.show': { paramsTuple?: []; params?: {} }
    'newspaper.persona.update': { paramsTuple?: []; params?: {} }
    'newspaper.persona.generate': { paramsTuple?: []; params?: {} }
    'newspaper.run_daily.store': { paramsTuple?: []; params?: {} }
    'newspaper.categories.index': { paramsTuple?: []; params?: {} }
    'newspaper.categories.store': { paramsTuple?: []; params?: {} }
    'newspaper.categories.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.categories.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.sources.index': { paramsTuple?: []; params?: {} }
    'newspaper.sources.store': { paramsTuple?: []; params?: {} }
    'newspaper.sources.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.sources.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.config.show_schedule': { paramsTuple?: []; params?: {} }
    'newspaper.config.update_schedule': { paramsTuple?: []; params?: {} }
    'newspaper.config.gap_topics': { paramsTuple?: []; params?: {} }
    'newspaper.config.update_gap_topics': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'onboarding.onboarding.invitation': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'admin.admin_sessions.me': { paramsTuple?: []; params?: {} }
    'admin.admin_invitations.index': { paramsTuple?: []; params?: {} }
    'admin.admin_users.index': { paramsTuple?: []; params?: {} }
    'newspaper.editions.today': { paramsTuple?: []; params?: {} }
    'newspaper.editions.show': { paramsTuple: [ParamValue]; params: {'date': ParamValue} }
    'newspaper.quiz.score': { paramsTuple?: []; params?: {} }
    'newspaper.persona.show': { paramsTuple?: []; params?: {} }
    'newspaper.categories.index': { paramsTuple?: []; params?: {} }
    'newspaper.sources.index': { paramsTuple?: []; params?: {} }
    'newspaper.config.show_schedule': { paramsTuple?: []; params?: {} }
    'newspaper.config.gap_topics': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'onboarding.onboarding.invitation': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'admin.admin_sessions.me': { paramsTuple?: []; params?: {} }
    'admin.admin_invitations.index': { paramsTuple?: []; params?: {} }
    'admin.admin_users.index': { paramsTuple?: []; params?: {} }
    'newspaper.editions.today': { paramsTuple?: []; params?: {} }
    'newspaper.editions.show': { paramsTuple: [ParamValue]; params: {'date': ParamValue} }
    'newspaper.quiz.score': { paramsTuple?: []; params?: {} }
    'newspaper.persona.show': { paramsTuple?: []; params?: {} }
    'newspaper.categories.index': { paramsTuple?: []; params?: {} }
    'newspaper.sources.index': { paramsTuple?: []; params?: {} }
    'newspaper.config.show_schedule': { paramsTuple?: []; params?: {} }
    'newspaper.config.gap_topics': { paramsTuple?: []; params?: {} }
    'event_stream': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.access_tokens.store': { paramsTuple?: []; params?: {} }
    'onboarding.onboarding.accept': { paramsTuple?: []; params?: {} }
    'onboarding.onboarding.categories': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'admin.admin_sessions.store': { paramsTuple?: []; params?: {} }
    'admin.admin_sessions.destroy': { paramsTuple?: []; params?: {} }
    'admin.admin_sessions.reset_password': { paramsTuple?: []; params?: {} }
    'admin.admin_invitations.store': { paramsTuple?: []; params?: {} }
    'admin.admin_invitations.resend': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.admin_users.toggle_status': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'admin.admin_users.send_edition': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.items.rate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.items.discard': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.quiz.answer': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.links.store': { paramsTuple?: []; params?: {} }
    'newspaper.persona.generate': { paramsTuple?: []; params?: {} }
    'newspaper.run_daily.store': { paramsTuple?: []; params?: {} }
    'newspaper.categories.store': { paramsTuple?: []; params?: {} }
    'newspaper.sources.store': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'newspaper.persona.update': { paramsTuple?: []; params?: {} }
    'newspaper.categories.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.sources.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.config.update_schedule': { paramsTuple?: []; params?: {} }
    'newspaper.config.update_gap_topics': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'newspaper.categories.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'newspaper.sources.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}