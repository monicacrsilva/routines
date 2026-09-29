(function () {
  "use strict";

  var SECOND = 1000;
  var MINUTE_SECONDS = 60;
  var DAY_SECONDS = 24 * 60 * 60;
  var DEFAULT_LABELS = {
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
  };
  var lastWeather = null;
  var lastWeatherLocation = "";
  var audioContext = null;
  var audioAuthorized = false;
  var soundConfig = null;
  var invalidPhaseWarnings = {};
  var soundAlertState = {
    initialized: false,
    phaseId: "",
    stepId: "",
    mode: "",
    previousRemaining: null,
    warningFired: false,
    urgentFired: false
  };

  function getLabel(name) {
    var config = window.ROUTINE_CONFIG;
    var labels = config && config.labels;

    return labels && typeof labels[name] === "string" ? labels[name] : DEFAULT_LABELS[name];
  }

  function parseTime(value) {
    var match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value || "");
    var hours;
    var minutes;
    var seconds;

    if (!match) {
      return null;
    }

    hours = Number(match[1]);
    minutes = Number(match[2]);
    seconds = Number(match[3] || 0);

    if (hours > 23 || minutes > 59 || seconds > 59) {
      return null;
    }

    return (hours * 60 * 60) + (minutes * 60) + seconds;
  }

  function formatClock(totalSeconds) {
    var daySeconds = 24 * 60 * 60;
    var normalized = ((Math.floor(totalSeconds) % daySeconds) + daySeconds) % daySeconds;
    var hours = Math.floor(normalized / 3600);
    var minutes = Math.floor((normalized % 3600) / 60);
    return pad(hours) + ":" + pad(minutes);
  }

  function formatCountdown(totalSeconds) {
    var safeSeconds = Math.max(0, Math.ceil(totalSeconds));
    var minutes = Math.floor(safeSeconds / 60);
    var seconds = safeSeconds % 60;
    return pad(minutes) + ":" + pad(seconds);
  }

  function formatElapsed(totalSeconds) {
    var safeSeconds = Math.max(0, Math.floor(totalSeconds));
    var minutes = Math.floor(safeSeconds / 60);
    var seconds = safeSeconds % 60;
    return pad(minutes) + ":" + pad(seconds);
  }

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function formatDate(date) {
    var weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
    var months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

    try {
      return new Intl.DateTimeFormat("pt-PT", {
        weekday: "long",
        day: "numeric",
        month: "long"
      }).format(date);
    } catch (error) {
      return weekdays[date.getDay()] + ", " + date.getDate() + " de " + months[date.getMonth()];
    }
  }

  function interpretWeatherCode(code) {
    if (code === 0) {
      return { icon: "☀️", label: getLabel("weatherClear") };
    }
    if (code === 1 || code === 2) {
      return { icon: "🌤️", label: getLabel("weatherPartlyCloudy") };
    }
    if (code === 3) {
      return { icon: "☁️", label: getLabel("weatherCloudy") };
    }
    if (code === 45 || code === 48) {
      return { icon: "🌫️", label: getLabel("weatherFog") };
    }
    if (code >= 95) {
      return { icon: "⛈️", label: getLabel("weatherThunderstorm") };
    }
    if (code >= 51 && code <= 86) {
      return { icon: "🌧️", label: getLabel("weatherRain") };
    }
    return { icon: "☁️", label: getLabel("weatherCloudy") };
  }

  function parseWeatherResponse(payload) {
    var current = payload && payload.current;
    var temperature;
    var apparentTemperature;
    var precipitation;
    var weatherCode;

    if (!current) {
      return null;
    }

    temperature = Number(current.temperature_2m);
    apparentTemperature = Number(current.apparent_temperature);
    precipitation = Number(current.precipitation);
    weatherCode = Number(current.weather_code);

    if (!isFinite(temperature) || !isFinite(apparentTemperature) || !isFinite(precipitation) || !isFinite(weatherCode)) {
      return null;
    }

    return {
      temperature: temperature,
      apparentTemperature: apparentTemperature,
      precipitation: precipitation,
      weatherCode: weatherCode
    };
  }

  function formatWeather(weather, weatherConfig) {
    weatherConfig = weatherConfig || (window.ROUTINE_CONFIG && window.ROUTINE_CONFIG.weather);
    var condition = interpretWeatherCode(weather.weatherCode);
    var precipitationThreshold = Number(weatherConfig && weatherConfig.precipitationThreshold);
    var apparentTemperatureDifference = Number(weatherConfig && weatherConfig.apparentTemperatureDifference);
    var text = condition.icon + " " + Math.round(weather.temperature) + " °C";

    precipitationThreshold = isFinite(precipitationThreshold) ? precipitationThreshold : 0.1;
    apparentTemperatureDifference = isFinite(apparentTemperatureDifference) ? apparentTemperatureDifference : 3;
    if (weather.precipitation >= precipitationThreshold || condition.label === getLabel("weatherRain") || condition.label === getLabel("weatherThunderstorm")) {
      text += " · " + condition.label;
    }
    if (Math.abs(weather.apparentTemperature - weather.temperature) >= apparentTemperatureDifference) {
      text += " · " + getLabel("feelsLike") + " " + Math.round(weather.apparentTemperature) + " °C";
    }
    return text;
  }

  function renderWeather(weather, locationLabel, weatherConfig) {
    var element = document.getElementById("weather");
    var locationElement = document.getElementById("weather-location");

    if (!weather) {
      element.textContent = "";
      element.hidden = true;
      locationElement.textContent = "";
      locationElement.hidden = true;
      return;
    }

    element.textContent = formatWeather(weather, weatherConfig);
    element.hidden = false;
    locationElement.textContent = locationLabel ? "📍 " + locationLabel : "";
    locationElement.hidden = !locationLabel;
  }

  function fetchWeather(weatherConfig) {
    var latitude;
    var longitude;
    var request;
    var url;

    if (!weatherConfig || weatherConfig.enabled !== true) {
      renderWeather(null);
      return;
    }

    latitude = Number(weatherConfig.latitude);
    longitude = Number(weatherConfig.longitude);
    if (!isFinite(latitude) || !isFinite(longitude)) {
      renderWeather(null);
      return;
    }

    url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(latitude) +
      "&longitude=" + encodeURIComponent(longitude) +
      "&current=temperature_2m,apparent_temperature,precipitation,weather_code" +
      "&temperature_unit=celsius";

    request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.timeout = 8000;
    request.onreadystatechange = function () {
      var parsed;

      if (request.readyState !== 4) {
        return;
      }
      if (request.status >= 200 && request.status < 300) {
        try {
          parsed = parseWeatherResponse(JSON.parse(request.responseText));
        } catch (error) {
          parsed = null;
        }
        if (parsed) {
          lastWeather = parsed;
          lastWeatherLocation = weatherConfig.locationLabel || "";
          renderWeather(parsed, lastWeatherLocation, weatherConfig);
          return;
        }
      }
      renderWeather(lastWeather, lastWeatherLocation, weatherConfig);
    };
    request.onerror = function () {
      renderWeather(lastWeather, lastWeatherLocation, weatherConfig);
    };
    request.ontimeout = function () {
      renderWeather(lastWeather, lastWeatherLocation, weatherConfig);
    };
    request.send();
  }

  function startWeather(weatherConfig) {
    var refreshMinutes;
    var activeWeatherConfig = weatherConfig;

    if (!weatherConfig || weatherConfig.enabled !== true) {
      renderWeather(null);
      return null;
    }

    fetchWeather(activeWeatherConfig);
    if (weatherConfig.useCurrentLocation === true && navigator.geolocation && typeof navigator.geolocation.getCurrentPosition === "function") {
      navigator.geolocation.getCurrentPosition(function (position) {
        var locationConfig = {};
        var property;

        for (property in weatherConfig) {
          if (Object.prototype.hasOwnProperty.call(weatherConfig, property)) {
            locationConfig[property] = weatherConfig[property];
          }
        }
        locationConfig.latitude = position.coords.latitude;
        locationConfig.longitude = position.coords.longitude;
        locationConfig.locationLabel = getLabel("currentLocation");
        activeWeatherConfig = locationConfig;
        fetchWeather(activeWeatherConfig);
      }, function () {
        activeWeatherConfig = weatherConfig;
      }, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 30 * 60 * 1000
      });
    }
    refreshMinutes = Number(weatherConfig.refreshMinutes);
    if (!isFinite(refreshMinutes) || refreshMinutes <= 0) {
      refreshMinutes = 10;
    }
    return window.setInterval(function () {
      fetchWeather(activeWeatherConfig);
    }, refreshMinutes * MINUTE_SECONDS * SECOND);
  }

  function initAudio() {
    var AudioContextClass;

    if (audioContext) {
      return audioContext;
    }

    AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    try {
      audioContext = new AudioContextClass();
      return audioContext;
    } catch (error) {
      audioContext = null;
      return null;
    }
  }

  function updateSoundControl(active) {
    var button = document.getElementById("sound-toggle");

    if (!button) {
      return;
    }
    button.textContent = active ? getLabel("soundActive") : getLabel("soundEnable");
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.className = "sound-toggle" + (active ? " is-active" : "");
  }

  function enableAudio() {
    var context = initAudio();
    var resumeResult;

    if (!context) {
      document.getElementById("sound-toggle").hidden = true;
      return;
    }

    function markAuthorized() {
      audioAuthorized = true;
      updateSoundControl(true);
    }

    try {
      if (context.state === "suspended" && context.resume) {
        resumeResult = context.resume();
        if (resumeResult && typeof resumeResult.then === "function") {
          resumeResult.then(markAuthorized, function () {
            audioAuthorized = false;
          });
        } else {
          markAuthorized();
        }
      } else {
        markAuthorized();
      }
    } catch (error) {
      audioAuthorized = false;
    }
  }

  function playBeep(frequency, durationMs, startTime, volume) {
    var oscillator;
    var gain;
    var endTime;

    if (!audioAuthorized || !audioContext) {
      return false;
    }

    try {
      oscillator = audioContext.createOscillator();
      gain = audioContext.createGain();
      endTime = startTime + (durationMs / 1000);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime + 0.02);
      return true;
    } catch (error) {
      audioAuthorized = false;
      return false;
    }
  }

  function playBeepPattern(alertConfig) {
    var volume;
    var beeps;
    var frequency;
    var durationMs;
    var gapMs;
    var startTime;
    var index;

    if (!audioAuthorized || !audioContext || !soundConfig || !alertConfig || alertConfig.enabled !== true) {
      return false;
    }

    volume = Number(soundConfig.volume);
    beeps = Number(alertConfig.beeps);
    frequency = Number(alertConfig.frequency);
    durationMs = Number(alertConfig.durationMs);
    gapMs = Number(alertConfig.gapMs);
    if (!isFinite(volume) || !isFinite(beeps) || !isFinite(frequency) || !isFinite(durationMs) || !isFinite(gapMs)) {
      return false;
    }

    startTime = audioContext.currentTime + 0.02;
    for (index = 0; index < Math.max(0, Math.floor(beeps)); index += 1) {
      playBeep(frequency, durationMs, startTime + (index * (durationMs + gapMs) / 1000), Math.max(0.0001, Math.min(1, volume)));
    }
    return true;
  }

  function resetSoundAlertState() {
    soundAlertState.initialized = false;
    soundAlertState.phaseId = "";
    soundAlertState.stepId = "";
    soundAlertState.mode = "";
    soundAlertState.previousRemaining = null;
    soundAlertState.warningFired = false;
    soundAlertState.urgentFired = false;
  }

  function handleSoundAlerts(schedule, nowSeconds, sounds) {
    var state;
    var phaseId;
    var stepId;
    var warningSeconds;
    var urgentSeconds;
    var sameStep;
    var pressureDisabled;
    var startAlert;

    if (!sounds || sounds.enabled !== true) {
      return;
    }
    if (!schedule || schedule.phase.displayMode !== "sequence") {
      resetSoundAlertState();
      return;
    }

    state = getViewState(schedule, nowSeconds);
    phaseId = schedule.phase.id;
    stepId = state.mode === "active" ? state.step.id : "";
    pressureDisabled = state.mode === "active" && state.step.pressureMode === "none";

    if (!soundAlertState.initialized || soundAlertState.phaseId !== phaseId) {
      resetSoundAlertState();
      soundAlertState.initialized = true;
      soundAlertState.phaseId = phaseId;
      soundAlertState.stepId = stepId;
      soundAlertState.mode = state.mode;
      soundAlertState.previousRemaining = state.mode === "active" ? state.remainingSeconds : null;
      soundAlertState.warningFired = pressureDisabled || (state.mode === "active" && state.remainingSeconds <= schedule.settings.warningMinutes * MINUTE_SECONDS);
      soundAlertState.urgentFired = pressureDisabled || (state.mode === "active" && state.remainingSeconds <= schedule.settings.urgentMinutes * MINUTE_SECONDS);
      return;
    }

    sameStep = state.mode === "active" && soundAlertState.mode === "active" && soundAlertState.stepId === stepId;
    if (state.mode === "active" && !sameStep) {
      if (soundAlertState.mode === "active" && soundAlertState.stepId !== stepId) {
        startAlert = state.step.startSound && sounds[state.step.startSound];
        playBeepPattern(startAlert || sounds.stepChange);
      }
      soundAlertState.warningFired = false;
      soundAlertState.urgentFired = false;
      soundAlertState.previousRemaining = null;
    }

    if (state.mode === "active") {
      if (pressureDisabled) {
        soundAlertState.warningFired = true;
        soundAlertState.urgentFired = true;
      }
      warningSeconds = schedule.settings.warningMinutes * MINUTE_SECONDS;
      urgentSeconds = schedule.settings.urgentMinutes * MINUTE_SECONDS;
      if (!soundAlertState.warningFired && sounds.warning.enabled === true &&
          (soundAlertState.previousRemaining === null || soundAlertState.previousRemaining > warningSeconds) &&
          state.remainingSeconds <= warningSeconds) {
        playBeepPattern(sounds.warning);
        soundAlertState.warningFired = true;
      }
      if (!soundAlertState.urgentFired && sounds.urgent.enabled === true &&
          (soundAlertState.previousRemaining === null || soundAlertState.previousRemaining > urgentSeconds) &&
          state.remainingSeconds <= urgentSeconds) {
        playBeepPattern(sounds.urgent);
        soundAlertState.urgentFired = true;
      }
      soundAlertState.previousRemaining = state.remainingSeconds;
    }

    soundAlertState.phaseId = phaseId;
    soundAlertState.stepId = stepId;
    soundAlertState.mode = state.mode;
  }

  function setupSoundControl(sounds) {
    var button = document.getElementById("sound-toggle");

    soundConfig = sounds;
    if (!sounds || sounds.enabled !== true || !button) {
      if (button) {
        button.hidden = true;
      }
      return;
    }

    button.hidden = false;
    updateSoundControl(false);
    button.addEventListener("click", enableAudio);
  }

  function formatIsoDate(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function isPhaseSkipped(phase, date) {
    var ranges = phase && phase.skipDates;
    var dateText;
    var index;
    var range;

    if (!date || !ranges || !ranges.length) {
      return false;
    }
    dateText = formatIsoDate(date);
    for (index = 0; index < ranges.length; index += 1) {
      range = ranges[index];
      if (typeof range === "string" && dateText === range) {
        return true;
      }
      if (range && range.length === 2 && dateText >= range[0] && dateText <= range[1]) {
        return true;
      }
    }
    return false;
  }

  function getPhasesForDay(config, day, date) {
    var phases = config && config.dayPhases ? config.dayPhases : [];
    var matches = [];
    var index;

    for (index = 0; index < phases.length; index += 1) {
      if (phases[index] && phases[index].enabled !== false && phases[index].days && phases[index].days.indexOf(day) !== -1 && !isPhaseSkipped(phases[index], date)) {
        matches.push(phases[index]);
      }
    }

    return matches;
  }

  function getPhaseSettings(phase, day) {
    var override = phase.dayOverrides && phase.dayOverrides[String(day)];
    return {
      referenceTime: override && override.referenceTime ? override.referenceTime : phase.referenceTime,
      startTime: override && override.startTime ? override.startTime : phase.startTime,
      endTime: override && override.endTime ? override.endTime : phase.endTime,
      stepOverrides: override && override.stepOverrides ? override.stepOverrides : {},
      warningMinutes: override && typeof override.warningMinutes === "number" ? override.warningMinutes : (typeof phase.warningMinutes === "number" ? phase.warningMinutes : 5),
      urgentMinutes: override && typeof override.urgentMinutes === "number" ? override.urgentMinutes : (typeof phase.urgentMinutes === "number" ? phase.urgentMinutes : 2),
      gracePeriodMinutes: override && typeof override.gracePeriodMinutes === "number" ? override.gracePeriodMinutes : (typeof phase.gracePeriodMinutes === "number" ? phase.gracePeriodMinutes : 0)
    };
  }

  function warnInvalidPhase(phase, reason) {
    var warningKey = (phase.id || "sem id") + ":" + reason;

    if (!invalidPhaseWarnings[warningKey] && window.console && typeof window.console.warn === "function") {
      invalidPhaseWarnings[warningKey] = true;
      window.console.warn("Fase ignorada (" + (phase.id || "sem id") + "): " + reason);
    }
  }

  function buildPhaseSchedule(phase, day) {
    var settings = getPhaseSettings(phase, day);
    var displayMode = phase.displayMode;
    var effectiveSteps = [];
    var referenceSeconds;
    var totalDuration = 0;
    var startSeconds;
    var endSeconds;
    var cursor;
    var scheduledSteps = [];
    var index;
    var property;
    var step;
    var stepOverride;
    var durationSeconds;

    if (displayMode === "passive") {
      startSeconds = parseTime(settings.startTime);
      if (startSeconds === null) {
        warnInvalidPhase(phase, "hora passiva inválida");
        return null;
      }
      if (!settings.endTime) {
        warnInvalidPhase(phase, "endTime em falta");
        return {
          phase: phase,
          settings: settings,
          steps: [],
          startSeconds: startSeconds,
          endSeconds: null,
          complete: false
        };
      }
      endSeconds = parseTime(settings.endTime);
      if (endSeconds === null) {
        warnInvalidPhase(phase, "endTime inválido");
        return null;
      }
      if (settings.endTime && endSeconds <= startSeconds) {
        endSeconds += 24 * 60 * 60;
      }
      return {
        phase: phase,
        settings: settings,
        steps: [],
        startSeconds: startSeconds,
        endSeconds: endSeconds,
        complete: true
      };
    }

    if (displayMode !== "sequence" || !phase.steps || phase.steps.length === 0) {
      warnInvalidPhase(phase, "displayMode ou steps inválidos");
      return null;
    }
    referenceSeconds = parseTime(settings.referenceTime);
    if (referenceSeconds === null) {
      warnInvalidPhase(phase, "referenceTime inválido");
      return null;
    }

    for (index = 0; index < phase.steps.length; index += 1) {
      step = {};
      for (property in phase.steps[index]) {
        if (Object.prototype.hasOwnProperty.call(phase.steps[index], property)) {
          step[property] = phase.steps[index][property];
        }
      }
      stepOverride = settings.stepOverrides[phase.steps[index].id];
      if (stepOverride) {
        for (property in stepOverride) {
          if (Object.prototype.hasOwnProperty.call(stepOverride, property)) {
            step[property] = stepOverride[property];
          }
        }
      }
      effectiveSteps.push(step);
    }

    for (index = 0; index < effectiveSteps.length; index += 1) {
      if (effectiveSteps[index].durationMinutes === null || effectiveSteps[index].durationMinutes === "") {
        warnInvalidPhase(phase, "durationMinutes em falta");
        return null;
      }
      durationSeconds = Number(effectiveSteps[index].durationMinutes) * MINUTE_SECONDS;
      if (!isFinite(durationSeconds) || durationSeconds < 0) {
        warnInvalidPhase(phase, "durationMinutes inválido");
        return null;
      }
      totalDuration += durationSeconds;
    }

    startSeconds = phase.anchor === "end" ? referenceSeconds - totalDuration : referenceSeconds;
    cursor = startSeconds;

    for (index = 0; index < effectiveSteps.length; index += 1) {
      step = effectiveSteps[index];
      durationSeconds = Number(step.durationMinutes) * MINUTE_SECONDS;
      scheduledSteps.push({
        id: step.id,
        text: step.text,
        shortText: step.shortText || step.text,
        icon: step.icon,
        completionText: step.completionText,
        completionLabel: step.completionLabel,
        pressureMode: step.pressureMode || "normal",
        startSound: step.startSound || "",
        startSeconds: cursor,
        endSeconds: cursor + durationSeconds,
        durationSeconds: durationSeconds
      });
      cursor += durationSeconds;
    }

    return {
      phase: phase,
      settings: settings,
      steps: scheduledSteps,
      startSeconds: startSeconds,
      endSeconds: phase.anchor === "end" ? referenceSeconds : cursor
    };
  }

  function getCurrentPhase(config, day, nowSeconds) {
    var phaseId = arguments.length > 3 ? arguments[3] : "";
    var date = arguments.length > 4 ? arguments[4] : null;
    var previousDate = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1) : null;
    var allPhases = config && config.dayPhases ? config.dayPhases : [];
    var phases = phaseId ? allPhases : getPhasesForDay(config, day, date);
    var previousPhases = phaseId ? [] : getPhasesForDay(config, (day + 6) % 7, previousDate);
    var candidates = [];
    var active = null;
    var overdue = null;
    var activePriority = -Infinity;
    var overduePriority = -Infinity;
    var index;
    var schedule;
    var priority;
    var graceEndSeconds;

    for (index = 0; index < phases.length; index += 1) {
      if (!phases[index]) {
        continue;
      }
      if (phases[index].enabled === false) {
        continue;
      }
      if (phaseId && String(phases[index].id).toLowerCase() !== String(phaseId).toLowerCase()) {
        continue;
      }

      schedule = buildPhaseSchedule(phases[index], day);
      if (!schedule || schedule.complete === false) {
        continue;
      }
      if (phaseId) {
        return schedule;
      }

      candidates.push(schedule);
    }

    for (index = 0; index < previousPhases.length; index += 1) {
      schedule = buildPhaseSchedule(previousPhases[index], (day + 6) % 7);
      if (schedule && schedule.complete !== false && schedule.endSeconds > DAY_SECONDS) {
        schedule.startSeconds -= DAY_SECONDS;
        schedule.endSeconds -= DAY_SECONDS;
        candidates.push(schedule);
      }
    }

    for (index = 0; index < candidates.length; index += 1) {
      schedule = candidates[index];
      priority = typeof schedule.phase.priority === "number" ? schedule.phase.priority : 0;
      graceEndSeconds = schedule.phase.displayMode === "sequence" ? schedule.endSeconds + Math.max(0, schedule.settings.gracePeriodMinutes) * MINUTE_SECONDS : schedule.endSeconds;
      if (nowSeconds >= schedule.startSeconds && nowSeconds < schedule.endSeconds && priority > activePriority) {
        active = schedule;
        activePriority = priority;
      } else if (nowSeconds >= schedule.endSeconds && nowSeconds < graceEndSeconds && priority > overduePriority) {
        overdue = schedule;
        overduePriority = priority;
      }
    }

    return active || overdue;
  }

  function getNextPhase(config, day, nowSeconds, date) {
    var next = null;
    var dayOffset;
    var targetDay;
    var phases;
    var index;
    var schedule;
    var absoluteStart;
    var targetDate;

    for (dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
      targetDay = (day + dayOffset) % 7;
      targetDate = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + dayOffset) : null;
      phases = getPhasesForDay(config, targetDay, targetDate);

      for (index = 0; index < phases.length; index += 1) {
        schedule = buildPhaseSchedule(phases[index], targetDay);
        if (!schedule) {
          continue;
        }
        absoluteStart = (dayOffset * 24 * 60 * 60) + schedule.startSeconds;

        if (absoluteStart > nowSeconds && (!next || absoluteStart < next.absoluteStart)) {
          next = {
            schedule: schedule,
            daysAhead: dayOffset,
            day: targetDay,
            absoluteStart: absoluteStart
          };
        }
      }
    }

    return next;
  }

  function formatIdlePhase(next) {
    var phaseName;

    if (!next) {
      return "";
    }
    phaseName = String(next.schedule.phase.name || "").toLowerCase().replace(/(^| · )([a-záàâãéêíóôõúç])/g, function (match, separator, letter) {
      return separator + letter.toUpperCase();
    });
    return (next.schedule.phase.icon || "") + " " + phaseName + " · " + formatClock(next.schedule.startSeconds);
  }

  function formatNextPhaseLabel(next) {
    var weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

    if (!next || next.daysAhead === 0) {
      return getLabel("next");
    }
    if (next.daysAhead === 1) {
      return getLabel("nextTomorrow");
    }
    return getLabel("next") + " " + weekdays[next.day];
  }

  function formatGreeting(nowSeconds) {
    var config = window.ROUTINE_CONFIG;
    var greetings = config && config.greetings;
    var morningUntil = parseTime(greetings && greetings.morningUntil);
    var afternoonUntil = parseTime(greetings && greetings.afternoonUntil);

    morningUntil = morningUntil === null ? 12 * 60 * 60 : morningUntil;
    afternoonUntil = afternoonUntil === null ? 20 * 60 * 60 : afternoonUntil;
    if (nowSeconds < morningUntil) {
      return getLabel("morningGreeting");
    }
    if (nowSeconds < afternoonUntil) {
      return getLabel("afternoonGreeting");
    }
    return getLabel("eveningGreeting");
  }

  function getIdleSettings(idleConfig) {
    var preRoutineMinutes = idleConfig && Number(idleConfig.preRoutineMinutes);

    return {
      preRoutineMinutes: isFinite(preRoutineMinutes) ? Math.max(0, preRoutineMinutes) : 30,
      showNextRoutine: !idleConfig || idleConfig.showNextRoutine !== false
    };
  }

  function getIdleState(nextSchedule, nowSeconds, idleConfig) {
    var settings = getIdleSettings(idleConfig);
    var secondsUntil = nextSchedule ? nextSchedule.absoluteStart - nowSeconds : Infinity;

    if (nextSchedule && nextSchedule.daysAhead === 0 && secondsUntil <= settings.preRoutineMinutes * MINUTE_SECONDS) {
      return {
        mode: "pre",
        title: formatGreeting(nowSeconds),
        showNextRoutine: settings.showNextRoutine
      };
    }
    if (nextSchedule && nextSchedule.daysAhead > 0) {
      return {
        mode: "end",
        title: formatGreeting(nowSeconds),
        showNextRoutine: settings.showNextRoutine
      };
    }
    return {
      mode: "normal",
      title: formatGreeting(nowSeconds),
      showNextRoutine: settings.showNextRoutine
    };
  }

  function getViewState(schedule, nowSeconds) {
    var steps = schedule.steps;
    var index;
    var step;
    var remaining;
    var tone = "normal";

    if (nowSeconds < schedule.startSeconds) {
      return { mode: "before", activeIndex: -1 };
    }

    if (nowSeconds >= schedule.endSeconds && nowSeconds < schedule.endSeconds + MINUTE_SECONDS) {
      return {
        mode: "leave",
        activeIndex: steps.length - 1
      };
    }

    if (nowSeconds >= schedule.endSeconds + MINUTE_SECONDS) {
      return {
        mode: "overdue",
        activeIndex: steps.length - 1,
        elapsedSeconds: nowSeconds - schedule.endSeconds
      };
    }

    for (index = 0; index < steps.length; index += 1) {
      step = steps[index];
      if (step.durationSeconds > 0 && nowSeconds >= step.startSeconds && nowSeconds < step.endSeconds) {
        remaining = step.endSeconds - nowSeconds;
        if (step.pressureMode === "none") {
          tone = "normal";
        } else if (remaining <= schedule.settings.urgentMinutes * MINUTE_SECONDS) {
          tone = "urgent";
        } else if (remaining <= schedule.settings.warningMinutes * MINUTE_SECONDS) {
          tone = "warning";
        }
        return {
          mode: "active",
          activeIndex: index,
          step: step,
          remainingSeconds: remaining,
          tone: tone
        };
      }
    }

    return { mode: "leave", activeIndex: steps.length - 1 };
  }

  function readQuery() {
    var query = window.location.search.replace(/^\?/, "").split("&");
    var values = {};
    var index;
    var pair;

    for (index = 0; index < query.length; index += 1) {
      if (!query[index]) {
        continue;
      }
      pair = query[index].split("=");
      values[decodeURIComponent(pair[0])] = decodeURIComponent((pair[1] || "").replace(/\+/g, " "));
    }
    return values;
  }

  function createTimeSource(query) {
    var simulatedSeconds = parseTime(query.time);
    var startedAt = new Date().getTime();
    var simulatedDay = query.day && /^[0-6]$/.test(query.day) ? Number(query.day) : null;

    return function () {
      var now = new Date();
      var displayDate = new Date(now.getTime());
      var seconds;

      if (simulatedSeconds !== null) {
        seconds = simulatedSeconds + ((new Date().getTime() - startedAt) / SECOND);
      } else {
        seconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
      }

      if (simulatedDay !== null) {
        displayDate.setDate(displayDate.getDate() + simulatedDay - displayDate.getDay());
      }

      return {
        seconds: seconds,
        day: simulatedDay !== null ? simulatedDay : now.getDay(),
        date: displayDate,
        simulated: simulatedSeconds !== null || simulatedDay !== null || Boolean(query.phase || query.routine)
      };
    };
  }

  function scheduleAutomaticReload(reloadConfig, query) {
    var reloadSeconds;
    var now;
    var reloadAt;

    if (!reloadConfig || reloadConfig.enabled !== true || query.time || query.day || query.phase || query.routine) {
      return null;
    }
    reloadSeconds = parseTime(reloadConfig.time);
    if (reloadSeconds === null) {
      return null;
    }
    now = new Date();
    reloadAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, reloadSeconds, 0);
    if (reloadAt.getTime() <= now.getTime()) {
      reloadAt.setDate(reloadAt.getDate() + 1);
    }
    return window.setTimeout(function () {
      window.location.reload();
    }, reloadAt.getTime() - now.getTime());
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function renderStepProgress(state) {
    var progressElement = document.getElementById("step-progress");
    var fillElement = document.getElementById("step-progress-fill");
    var progress = 0;

    if (state && state.mode === "active" && state.step.durationSeconds > 0) {
      progress = 1 - (state.remainingSeconds / state.step.durationSeconds);
      progress = Math.max(0, Math.min(1, progress));
      fillElement.style.width = (progress * 100) + "%";
      progressElement.setAttribute("aria-valuenow", String(Math.round(progress * 100)));
      progressElement.hidden = false;
      return;
    }

    fillElement.style.width = "0%";
    progressElement.setAttribute("aria-valuenow", "0");
    progressElement.hidden = true;
  }

  function renderTimeline(schedule, activeIndex, nextPhase) {
    var timeline = document.getElementById("timeline");
    var fragment = document.createDocumentFragment();
    var index;
    var item;
    var marker;
    var label;
    var time;

    timeline.innerHTML = "";
    for (index = 0; index < schedule.steps.length; index += 1) {
      item = document.createElement("li");
      item.className = "timeline-step" + (index === activeIndex ? " is-current" : "");
      item.setAttribute("aria-current", index === activeIndex ? "step" : "false");

      marker = document.createElement("span");
      marker.className = "timeline-icon";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = schedule.steps[index].icon;

      label = document.createElement("span");
      label.className = "timeline-label";
      label.textContent = schedule.steps[index].shortText;

      time = document.createElement("time");
      time.className = "timeline-time";
      time.textContent = formatClock(schedule.steps[index].startSeconds);

      item.appendChild(marker);
      item.appendChild(label);
      item.appendChild(time);
      fragment.appendChild(item);
    }

    if (nextPhase) {
      item = document.createElement("li");
      item.className = "timeline-step timeline-next-phase";
      item.setAttribute("aria-current", "false");

      marker = document.createElement("span");
      marker.className = "timeline-icon";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = nextPhase.schedule.phase.icon || "";

      label = document.createElement("span");
      label.className = "timeline-label";
      label.textContent = nextPhase.schedule.phase.name;

      time = document.createElement("time");
      time.className = "timeline-time";
      time.textContent = formatClock(nextPhase.schedule.startSeconds);

      item.appendChild(marker);
      item.appendChild(label);
      item.appendChild(time);
      fragment.appendChild(item);
    }
    timeline.appendChild(fragment);
  }

  function renderNoRoutine(time, nextSchedule, idleConfig) {
    var idleState = getIdleState(nextSchedule, time.seconds, idleConfig);
    var showNextPhase = idleState.showNextRoutine && nextSchedule;

    document.body.className = "state-idle state-idle-" + idleState.mode;
    setText("current-time", formatClock(time.seconds));
    setText("task-icon", "");
    setText("task-name", idleState.title);
    setText("counter-label", "");
    setText("countdown", "");
    renderStepProgress(null);
    setText("phase-next-label", showNextPhase ? formatNextPhaseLabel(nextSchedule) : "");
    setText("phase-next", showNextPhase ? formatIdlePhase(nextSchedule) : "");
    document.getElementById("phase-next-label").hidden = !showNextPhase;
    document.getElementById("phase-next").hidden = !showNextPhase;
    document.getElementById("timeline").innerHTML = "";
    document.getElementById("phase-indicator").hidden = true;
  }

  function renderSequencePhase(schedule, time, nextPhase) {
    var state = getViewState(schedule, time.seconds);
    var bodyClass = "state-" + state.mode;
    var headline;
    var detail;

    if (state.tone) {
      bodyClass += " tone-" + state.tone;
    }
    document.body.className = bodyClass;

    setText("current-time", formatClock(time.seconds));
    setText("phase-indicator", schedule.phase.name + (time.simulated ? " · " + getLabel("test") : ""));

    if (state.mode === "before") {
      setText("task-icon", schedule.phase.icon || "☀️");
      setText("task-name", getLabel("notStarted"));
      setText("counter-label", getLabel("startsAt"));
      setText("countdown", formatClock(schedule.startSeconds));
    } else if (state.mode === "active") {
      setText("task-icon", state.step.icon);
      setText("task-name", state.step.text);
      setText("counter-label", state.tone === "urgent" ? getLabel("urgent") : getLabel("timeRemaining"));
      setText("countdown", formatCountdown(state.remainingSeconds));
    } else {
      detail = schedule.steps[schedule.steps.length - 1];
      headline = state.mode === "overdue" ? getLabel("overdue") : (detail.completionText || detail.text);
      setText("task-icon", detail.icon);
      setText("task-name", headline);
      setText("counter-label", state.mode === "overdue" ? getLabel("delay") : (detail.completionLabel || getLabel("time")));
      setText("countdown", state.mode === "overdue" ? formatElapsed(state.elapsedSeconds) : formatClock(schedule.endSeconds));
    }

    renderStepProgress(state);

    renderTimeline(schedule, state.activeIndex, nextPhase);
    setText("phase-next-label", "");
    setText("phase-next", "");
    document.getElementById("phase-next-label").hidden = true;
    document.getElementById("phase-next").hidden = true;
    document.getElementById("phase-indicator").hidden = false;
  }

  function renderPassivePhase(schedule, time, nextPhase) {
    var hasConfiguredEnd = Boolean(schedule.settings.endTime);

    document.body.className = "state-passive" + (schedule.phase.dimMode === true ? " phase-dim" : "");
    setText("current-time", formatClock(time.seconds));
    setText("phase-indicator", time.simulated ? getLabel("test") : "");
    setText("task-icon", schedule.phase.icon || "");
    setText("task-name", schedule.phase.name);
    setText("counter-label", hasConfiguredEnd ? formatClock(schedule.startSeconds) + " " + getLabel("rangeSeparator") + " " + formatClock(schedule.endSeconds) : getLabel("from") + " " + formatClock(schedule.startSeconds));
    setText("countdown", "");
    renderStepProgress(null);
    setText("phase-next-label", formatNextPhaseLabel(nextPhase));
    setText("phase-next", nextPhase ? formatIdlePhase(nextPhase) : "");
    document.getElementById("phase-next-label").hidden = !nextPhase;
    document.getElementById("phase-next").hidden = !nextPhase;
    document.getElementById("timeline").innerHTML = "";
    document.getElementById("phase-indicator").hidden = !time.simulated;
  }

  function start() {
    var config = window.ROUTINE_CONFIG;
    var query = readQuery();
    var getTime = createTimeSource(query);

    function update() {
      var time = getTime();
      var forcedPhase = query.phase || query.routine || "";
      var schedule = getCurrentPhase(config, time.day, time.seconds, forcedPhase, time.date);
      var nextPhase = getNextPhase(config, time.day, time.seconds, time.date);
      setText("current-date", formatDate(time.date));
      handleSoundAlerts(schedule, time.seconds, config.sounds);
      if (schedule) {
        if (schedule.phase.displayMode === "passive") {
          renderPassivePhase(schedule, time, nextPhase);
        } else {
          renderSequencePhase(schedule, time, nextPhase);
        }
      } else {
        renderNoRoutine(time, nextPhase, config.idle);
      }
    }

    setupSoundControl(config.sounds);
    scheduleAutomaticReload(config.automaticReload, query);
    update();
    window.setInterval(update, SECOND);
    startWeather(config.weather);
  }

  window.ROUTINE_APP = {
    parseTime: parseTime,
    formatClock: formatClock,
    formatCountdown: formatCountdown,
    formatElapsed: formatElapsed,
    formatDate: formatDate,
    interpretWeatherCode: interpretWeatherCode,
    parseWeatherResponse: parseWeatherResponse,
    formatWeather: formatWeather,
    fetchWeather: fetchWeather,
    renderWeather: renderWeather,
    startWeather: startWeather,
    initAudio: initAudio,
    enableAudio: enableAudio,
    playBeep: playBeep,
    playBeepPattern: playBeepPattern,
    handleSoundAlerts: handleSoundAlerts,
    resetSoundAlertState: resetSoundAlertState,
    setupSoundControl: setupSoundControl,
    buildPhaseSchedule: buildPhaseSchedule,
    getViewState: getViewState,
    getCurrentPhase: getCurrentPhase,
    getNextPhase: getNextPhase,
    isPhaseSkipped: isPhaseSkipped,
    scheduleAutomaticReload: scheduleAutomaticReload,
    formatGreeting: formatGreeting,
    getIdleSettings: getIdleSettings,
    getIdleState: getIdleState
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }
}());
