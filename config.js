window.ROUTINE_CONFIG = {
  weather: {
    enabled: true,
    latitude: 38.7223,
    longitude: -9.1393,
    refreshMinutes: 10
  },
  routines: [
    {
      id: "manha",
      name: "MANHÃ",
      icon: "☀️",
      priority: 10,
      days: [1, 2, 3, 4, 5],
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
          icon: "🪥",
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
    }
  ]
};
