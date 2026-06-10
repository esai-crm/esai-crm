import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Profile, Contact, Deal, Activity } from '@/types'
import { Lang } from '@/i18n/translations'

interface AppState {
  profile: Profile | null
  lang: Lang
  contacts: Contact[]
  deals: Deal[]
  activities: Activity[]
  sidebarOpen: boolean

  setProfile: (profile: Profile | null) => void
  setLang: (lang: Lang) => void
  setContacts: (contacts: Contact[]) => void
  setDeals: (deals: Deal[]) => void
  setActivities: (activities: Activity[]) => void
  setSidebarOpen: (open: boolean) => void
  updateContact: (id: string, data: Partial<Contact>) => void
  removeContact: (id: string) => void
  addContact: (contact: Contact) => void
  updateDeal: (id: string, data: Partial<Deal>) => void
  removeDeal: (id: string) => void
  addDeal: (deal: Deal) => void
  reset: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      lang: 'en',
      contacts: [],
      deals: [],
      activities: [],
      sidebarOpen: false,

      setProfile: (profile) => set({ profile }),
      setLang: (lang) => set({ lang }),
      setContacts: (contacts) => set({ contacts }),
      setDeals: (deals) => set({ deals }),
      setActivities: (activities) => set({ activities }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

      updateContact: (id, data) =>
        set((state) => ({
          contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),
      removeContact: (id) =>
        set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id) })),
      addContact: (contact) =>
        set((state) => ({ contacts: [contact, ...state.contacts] })),

      updateDeal: (id, data) =>
        set((state) => ({
          deals: state.deals.map((d) => (d.id === id ? { ...d, ...data } : d)),
        })),
      removeDeal: (id) =>
        set((state) => ({ deals: state.deals.filter((d) => d.id !== id) })),
      addDeal: (deal) =>
        set((state) => ({ deals: [deal, ...state.deals] })),

      reset: () =>
        set({ profile: null, contacts: [], deals: [], activities: [] }),
    }),
    {
      name: 'esai-store',
      partialize: (state) => ({ lang: state.lang }),
    }
  )
)
