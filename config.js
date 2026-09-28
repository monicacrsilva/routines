window.ROUTINE_CONFIG = {
  weather: {
    enabled: true,
    latitude: 38.7223,
    longitude: -9.1393,
    refreshMinutes: 10
  },
  sounds: {
    enabled: true,
    volume: 0.25,
    warning: {
      enabled: true,
      minutesBeforeEnd: 5,
      beeps: 1,
      frequency: 650,
      durationMs: 160,
      gapMs: 120
    },
    urgent: {
      enabled: true,
      minutesBeforeEnd: 2,
      beeps: 2,
      frequency: 850,
      durationMs: 180,
      gapMs: 140
    },
    stepChange: {
      enabled: true,
      beeps: 1,
      frequency: 750,
      durationMs: 220,
      gapMs: 120
    },
    leaveTime: {
      enabled: true,
      beeps: 3,
      frequency: 1000,
      durationMs: 250,
      gapMs: 180
    }
  },
  routines: [
    {
      id: "manha-escola",
      name: "MANHÃ",
      icon: "☀️",
      priority: 10,
      days: [1, 2, 3, 5],
      referenceTime: "07:20",
      anchor: "end",
      warningMinutes: 5,
      urgentMinutes: 2,
      gracePeriodMinutes: 15,
      dayOverrides: {
        // Exemplo: "3": { referenceTime: "07:35" }
      },
      steps: [
        {
          id: "wake-up",
          text: "ACORDAR E PREPARAR",
          shortText: "Acordar",
          icon: "☀️",
          durationMinutes: 10
        },
        {
          id: "breakfast",
          text: "PEQUENO ALMOÇO",
          shortText: "Pequeno-almoço",
          icon: "🥣",
          durationMinutes: 15
        },
        {
          id: "teeth-wc",
          text: "DENTES + WC",
          shortText: "Dentes + WC",
          icon: "🦷",
          durationMinutes: 5
        },
        {
          id: "dress",
          text: "VESTIR",
          shortText: "Vestir",
          icon: "👕",
          durationMinutes: 10
        },
        {
          id: "shoes-exit",
          text: "CALÇAR E PREPARAR SAÍDA",
          shortText: "Calçar e preparar para sair",
          icon: "🎒",
          durationMinutes: 5
        },
        {
          id: "leave",
          text: "SAIR",
          shortText: "Sair",
          icon: "🚪",
          durationMinutes: 0
        }
      ],
      milestones: [
        {
          id: "school",
          title: "Escola",
          icon: "🏫",
          time: "08:00"
        }
      ]
    },
    {
      id: "manha-escola-quinta",
      name: "MANHÃ",
      icon: "☀️",
      priority: 10,
      days: [4],
      referenceTime: "08:20",
      anchor: "end",
      warningMinutes: 5,
      urgentMinutes: 2,
      gracePeriodMinutes: 15,
      dayOverrides: {},
      steps: [
        {
          id: "wake-up",
          text: "ACORDAR E PREPARAR",
          shortText: "Acordar",
          icon: "☀️",
          durationMinutes: 10
        },
        {
          id: "breakfast",
          text: "PEQUENO ALMOÇO",
          shortText: "Pequeno-almoço",
          icon: "🥣",
          durationMinutes: 15
        },
        {
          id: "teeth-wc",
          text: "DENTES + WC",
          shortText: "Dentes + WC",
          icon: "🦷",
          durationMinutes: 5
        },
        {
          id: "dress",
          text: "VESTIR",
          shortText: "Vestir",
          icon: "👕",
          durationMinutes: 10
        },
        {
          id: "shoes-exit",
          text: "CALÇAR E PREPARAR SAÍDA",
          shortText: "Calçar e preparar para sair",
          icon: "🎒",
          durationMinutes: 5
        },
        {
          id: "leave",
          text: "SAIR",
          shortText: "Sair",
          icon: "🚪",
          durationMinutes: 0
        }
      ],
      milestones: [
        {
          id: "school",
          title: "Escola",
          icon: "🏫",
          time: "08:55"
        }
      ]
    },
    {
      id: "manha-ingles",
      name: "MANHÃ · INGLÊS",
      icon: "☀️",
      priority: 10,
      days: [6],
      referenceTime: "09:25",
      anchor: "end",
      warningMinutes: 5,
      urgentMinutes: 2,
      gracePeriodMinutes: 15,
      dayOverrides: {},
      steps: [
        {
          id: "wake-up",
          text: "ACORDAR E PREPARAR",
          shortText: "Acordar",
          icon: "☀️",
          durationMinutes: 10
        },
        {
          id: "breakfast",
          text: "PEQUENO ALMOÇO",
          shortText: "Pequeno-almoço",
          icon: "🥣",
          durationMinutes: 15
        },
        {
          id: "teeth-wc",
          text: "DENTES + WC",
          shortText: "Dentes + WC",
          icon: "🦷",
          durationMinutes: 5
        },
        {
          id: "dress",
          text: "VESTIR",
          shortText: "Vestir",
          icon: "👕",
          durationMinutes: 10
        },
        {
          id: "shoes-exit",
          text: "CALÇAR E PREPARAR SAÍDA",
          shortText: "Calçar e preparar para sair",
          icon: "🎒",
          durationMinutes: 5
        },
        {
          id: "leave",
          text: "SAIR",
          shortText: "Sair",
          icon: "🚪",
          durationMinutes: 0
        }
      ],
      milestones: [
        {
          id: "english-class",
          title: "Inglês",
          icon: "📚",
          time: "09:30"
        }
      ]
    }
  ]
};
