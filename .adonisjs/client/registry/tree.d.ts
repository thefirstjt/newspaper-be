/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    accessTokens: {
      store: typeof routes['auth.access_tokens.store']
    }
  }
  onboarding: {
    onboarding: {
      invitation: typeof routes['onboarding.onboarding.invitation']
      accept: typeof routes['onboarding.onboarding.accept']
      categories: typeof routes['onboarding.onboarding.categories']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  admin: {
    adminSessions: {
      store: typeof routes['admin.admin_sessions.store']
      me: typeof routes['admin.admin_sessions.me']
      destroy: typeof routes['admin.admin_sessions.destroy']
    }
    adminInvitations: {
      store: typeof routes['admin.admin_invitations.store']
      index: typeof routes['admin.admin_invitations.index']
    }
    adminUsers: {
      index: typeof routes['admin.admin_users.index']
      toggleStatus: typeof routes['admin.admin_users.toggle_status']
      sendEdition: typeof routes['admin.admin_users.send_edition']
    }
  }
  newspaper: {
    editions: {
      today: typeof routes['newspaper.editions.today']
      show: typeof routes['newspaper.editions.show']
    }
    items: {
      rate: typeof routes['newspaper.items.rate']
      discard: typeof routes['newspaper.items.discard']
    }
    quiz: {
      score: typeof routes['newspaper.quiz.score']
      answer: typeof routes['newspaper.quiz.answer']
    }
    links: {
      store: typeof routes['newspaper.links.store']
    }
    persona: {
      show: typeof routes['newspaper.persona.show']
      update: typeof routes['newspaper.persona.update']
      generate: typeof routes['newspaper.persona.generate']
    }
    runDaily: {
      store: typeof routes['newspaper.run_daily.store']
    }
    categories: {
      index: typeof routes['newspaper.categories.index']
      store: typeof routes['newspaper.categories.store']
      update: typeof routes['newspaper.categories.update']
      destroy: typeof routes['newspaper.categories.destroy']
    }
    sources: {
      index: typeof routes['newspaper.sources.index']
      store: typeof routes['newspaper.sources.store']
      update: typeof routes['newspaper.sources.update']
      destroy: typeof routes['newspaper.sources.destroy']
    }
    config: {
      showSchedule: typeof routes['newspaper.config.show_schedule']
      updateSchedule: typeof routes['newspaper.config.update_schedule']
      gapTopics: typeof routes['newspaper.config.gap_topics']
      updateGapTopics: typeof routes['newspaper.config.update_gap_topics']
    }
  }
}
