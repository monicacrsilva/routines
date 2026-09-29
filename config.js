window.ROUTINE_CONFIG = {
  labels: {
    notStarted: "AINDA NÃO COMEÇOU",
    startsAt: "COMEÇA ÀS",
    timeRemaining: "TEMPO RESTANTE",
    urgent: "DESPACHA-TE",
    overdue: "JÁ DEVÍAMOS TER SAÍDO",
    delay: "ATRASO",
    time: "HORA",
    next: "Próximo",
    nextTomorrow: "Próximo amanhã",
    soundEnable: "🔊 Ativar som",
    soundActive: "🔊 Som ativo",
    morningGreeting: "Bom dia",
    afternoonGreeting: "Boa tarde",
    eveningGreeting: "Boa noite",
    test: "TESTE",
    from: "A partir das",
    rangeSeparator: "às",
    currentLocation: "Localização atual",
    feelsLike: "sensação",
    weatherClear: "Céu limpo",
    weatherPartlyCloudy: "Parcialmente nublado",
    weatherCloudy: "Nublado",
    weatherFog: "Nevoeiro",
    weatherThunderstorm: "Trovoada",
    weatherRain: "Chuva"
  },
  greetings: {
    morningUntil: "12:00",
    afternoonUntil: "20:00"
  },
  weather: {
    enabled: true,
    useCurrentLocation: true,
    locationLabel: "Lisboa",
    latitude: 38.7223,
    longitude: -9.1393,
    precipitationThreshold: 0.1,
    apparentTemperatureDifference: 3,
    refreshMinutes: 10
  },
  idle: {
    preRoutineMinutes: 30,
    showNextRoutine: true
  },
  automaticReload: {
    enabled: true,
    time: "03:00"
  },
  sounds: {
    enabled: true,
    volume: 0.25,
    warning: {
      enabled: true,
      beeps: 1,
      frequency: 650,
      durationMs: 160,
      gapMs: 120
    },
    urgent: {
      enabled: true,
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
  dayPhases: [
    {
      id: "manha-escola",
      name: "MANHÃ",
      icon: "☀️",
      displayMode: "sequence",
      enabled: true,
      priority: 10,
      days: [1, 2, 3, 4, 5],
      skipDates: ["2026-10-05", ["2026-12-19", "2027-01-04"]],
      referenceTime: "08:00",
      anchor: "end",
      warningMinutes: 5,
      urgentMinutes: 2,
      gracePeriodMinutes: 0,
      dayOverrides: {
        "4": {
          referenceTime: "08:55",
          stepOverrides: {
            "to-school": {
              durationMinutes: 35
            }
          }
        }
      },
      steps: [
        {
          id: "wake-up",
          text: "ACORDAR E PREPARAR",
          shortText: "Acordar",
          icon: "☀️",
          durationMinutes: 5
        },
        {
          id: "breakfast",
          text: "PEQUENO ALMOÇO",
          shortText: "Pequeno almoço",
          icon: "🥣",
          durationMinutes: 15
        },
        {
          id: "teeth-wc",
          text: "WC + DENTES",
          shortText: "WC + Dentes",
          icon: "🦷",
          durationMinutes: 15
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
          shortText: "Preparar saída",
          icon: "🎒",
          durationMinutes: 5
        },
        {
          id: "to-school",
          text: "IR PARA A ESCOLA",
          shortText: "Ir para a escola",
          icon: "🚗",
          durationMinutes: 40,
          pressureMode: "none",
          startSound: "leaveTime"
        }
      ]
    },
    {
      id: "school",
      name: "ESCOLA",
      icon: "🏫",
      displayMode: "passive",
      enabled: true,
      priority: 5,
      days: [1, 2, 3, 4, 5],
      skipDates: ["2026-10-05", ["2026-12-19", "2027-01-04"]],
      startTime: "08:00",
      endTime: "17:30",
      dayOverrides: {
        "4": {
          startTime: "08:55"
        }
      }
    },
    {
      id: "evening",
      name: "FIM DO DIA",
      icon: "🌆",
      displayMode: "sequence",
      enabled: true,
      priority: 10,
      days: [1, 2, 3, 4, 5],
      referenceTime: "22:00",
      anchor: "end",
      warningMinutes: 5,
      urgentMinutes: 2,
      gracePeriodMinutes: 0,
      dayOverrides: {},
      steps: [
        {
          id: "shower",
          text: "BANHO",
          shortText: "Banho",
          icon: "🚿",
          durationMinutes: 20
        },
        {
          id: "homework-violin",
          text: "TPC + VIOLINO",
          shortText: "TPC + Violino",
          icon: "🎻",
          durationMinutes: 80
        },
        {
          id: "dinner",
          text: "JANTAR",
          shortText: "Jantar",
          icon: "🍽️",
          durationMinutes: 40
        },
        {
          id: "free-time",
          text: "TEMPO LIVRE",
          shortText: "Tempo livre",
          icon: "🎮",
          durationMinutes: 55,
          pressureMode: "none"
        },
        {
          id: "bedtime-prep",
          text: "DENTES E PREPARAR PARA DORMIR",
          shortText: "Dentes",
          icon: "🦷",
          durationMinutes: 15
        }
      ]
    },
    {
      id: "sleep",
      name: "DORMIR",
      icon: "🌙",
      displayMode: "passive",
      enabled: true,
      priority: 5,
      days: [0, 1, 2, 3, 4, 5, 6],
      dimMode: true,
      startTime: "22:00",
      endTime: "06:30",
      dayOverrides: {}
    },
    {
      id: "manha-ingles",
      name: "MANHÃ",
      icon: "☀️",
      displayMode: "sequence",
      enabled: true,
      priority: 10,
      days: [6],
      referenceTime: "09:30",
      anchor: "end",
      warningMinutes: 5,
      urgentMinutes: 2,
      gracePeriodMinutes: 0,
      dayOverrides: {},
      steps: [
        {
          id: "wake-up",
          text: "ACORDAR E PREPARAR",
          shortText: "Acordar",
          icon: "☀️",
          durationMinutes: 5
        },
        {
          id: "breakfast",
          text: "PEQUENO ALMOÇO",
          shortText: "Pequeno almoço",
          icon: "🥣",
          durationMinutes: 15
        },
        {
          id: "teeth-wc",
          text: "WC + DENTES",
          shortText: "WC + Dentes",
          icon: "🦷",
          durationMinutes: 15
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
          shortText: "Preparar saída",
          icon: "🎒",
          durationMinutes: 5
        },
        {
          id: "to-english",
          text: "IR PARA O INGLÊS",
          shortText: "Ir para o Inglês",
          icon: "🚗",
          durationMinutes: 5,
          pressureMode: "none"
        }
      ]
    },
    {
      id: "english",
      name: "INGLÊS",
      icon: "📚",
      displayMode: "passive",
      enabled: true,
      priority: 5,
      days: [6],
      startTime: "09:30",
      endTime: "11:00",
      dayOverrides: {}
    }
  ]
};
