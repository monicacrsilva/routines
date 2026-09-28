(function () {
  "use strict";

  var SECOND = 1000;
  var MINUTE_SECONDS = 60;
  var lastWeather = null;
  var audioContext = null;
  var audioAuthorized = false;
  var soundConfig = null;
  var soundAlertState = {
    initialized: false,
    routineId: "",
    stepId: "",
    mode: "",
    previousRemaining: null,
    warningFired: false,
    urgentFired: false,
    leaveFired: false
  };

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
      return { icon: "☀️", label: "Céu limpo" };
    }
    if (code === 1 || code === 2) {
      return { icon: "🌤️", label: "Parcialmente nublado" };
    }
    if (code === 3) {
      return { icon: "☁️", label: "Nublado" };
    }
    if (code === 45 || code === 48) {
      return { icon: "🌫️", label: "Nevoeiro" };
    }
    if (code >= 95) {
      return { icon: "⛈️", label: "Trovoada" };
    }
    if (code >= 51 && code <= 86) {
      return { icon: "🌧️", label: "Chuva" };
    }
    return { icon: "☁️", label: "Nublado" };
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

  function formatWeather(weather) {
    var condition = interpretWeatherCode(weather.weatherCode);
    var text = condition.icon + " " + Math.round(weather.temperature) + " °C";

    if (weather.precipitation >= 0.1 || condition.label === "Chuva" || condition.label === "Trovoada") {
      text += " · " + condition.label;
    }
    if (Math.abs(weather.apparentTemperature - weather.temperature) >= 3) {
      text += " · sensação " + Math.round(weather.apparentTemperature) + " °C";
    }
    return text;
  }

  function renderWeather(weather) {
    var element = document.getElementById("weather");

    if (!weather) {
      element.textContent = "";
      element.hidden = true;
      return;
    }

    element.textContent = formatWeather(weather);
    element.hidden = false;
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
          renderWeather(parsed);
          return;
        }
      }
      renderWeather(lastWeather);
    };
    request.onerror = function () {
      renderWeather(lastWeather);
    };
    request.ontimeout = function () {
      renderWeather(lastWeather);
    };
    request.send();
  }

  function startWeather(weatherConfig) {
    var refreshMinutes;

    if (!weatherConfig || weatherConfig.enabled !== true) {
      renderWeather(null);
      return null;
    }

    fetchWeather(weatherConfig);
    refreshMinutes = Number(weatherConfig.refreshMinutes);
    if (!isFinite(refreshMinutes) || refreshMinutes <= 0) {
      refreshMinutes = 10;
    }
    return window.setInterval(function () {
      fetchWeather(weatherConfig);
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
    button.textContent = active ? "🔊 Som ativo" : "🔊 Ativar som";
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
    soundAlertState.routineId = "";
    soundAlertState.stepId = "";
    soundAlertState.mode = "";
    soundAlertState.previousRemaining = null;
    soundAlertState.warningFired = false;
    soundAlertState.urgentFired = false;
    soundAlertState.leaveFired = false;
  }

  function handleSoundAlerts(schedule, nowSeconds, sounds) {
    var state;
    var routineId;
    var stepId;
    var warningSeconds;
    var urgentSeconds;
    var sameStep;

    if (!sounds || sounds.enabled !== true) {
      return;
    }
    if (!schedule) {
      resetSoundAlertState();
      return;
    }

    state = getViewState(schedule, nowSeconds);
    routineId = schedule.routine.id;
    stepId = state.mode === "active" ? state.step.id : "";

    if (!soundAlertState.initialized || soundAlertState.routineId !== routineId) {
      resetSoundAlertState();
      soundAlertState.initialized = true;
      soundAlertState.routineId = routineId;
      soundAlertState.stepId = stepId;
      soundAlertState.mode = state.mode;
      soundAlertState.previousRemaining = state.mode === "active" ? state.remainingSeconds : null;
      soundAlertState.warningFired = state.mode === "active" && state.remainingSeconds <= Number(sounds.warning.minutesBeforeEnd) * MINUTE_SECONDS;
      soundAlertState.urgentFired = state.mode === "active" && state.remainingSeconds <= Number(sounds.urgent.minutesBeforeEnd) * MINUTE_SECONDS;
      soundAlertState.leaveFired = state.mode === "leave" || state.mode === "overdue";
      return;
    }

    sameStep = state.mode === "active" && soundAlertState.mode === "active" && soundAlertState.stepId === stepId;
    if (state.mode === "active" && !sameStep) {
      if (soundAlertState.mode === "active" && soundAlertState.stepId !== stepId) {
        playBeepPattern(sounds.stepChange);
      }
      soundAlertState.warningFired = false;
      soundAlertState.urgentFired = false;
      soundAlertState.previousRemaining = null;
    }

    if (state.mode === "active") {
      warningSeconds = Number(sounds.warning.minutesBeforeEnd) * MINUTE_SECONDS;
      urgentSeconds = Number(sounds.urgent.minutesBeforeEnd) * MINUTE_SECONDS;
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

    if (state.mode === "leave" && !soundAlertState.leaveFired) {
      playBeepPattern(sounds.leaveTime);
      soundAlertState.leaveFired = true;
    }

    soundAlertState.routineId = routineId;
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

  function getRoutineForDay(config, day) {
    var routines = config && config.routines ? config.routines : [];
    var matches = [];
    var index;

    for (index = 0; index < routines.length; index += 1) {
      if (routines[index].days.indexOf(day) !== -1) {
        matches.push(routines[index]);
      }
    }

    return matches;
  }

  function getDaySettings(routine, day) {
    var override = routine.dayOverrides && routine.dayOverrides[String(day)];
    return {
      referenceTime: override && override.referenceTime ? override.referenceTime : routine.referenceTime,
      warningMinutes: override && typeof override.warningMinutes === "number" ? override.warningMinutes : routine.warningMinutes,
      urgentMinutes: override && typeof override.urgentMinutes === "number" ? override.urgentMinutes : routine.urgentMinutes,
      gracePeriodMinutes: override && typeof override.gracePeriodMinutes === "number" ? override.gracePeriodMinutes : (typeof routine.gracePeriodMinutes === "number" ? routine.gracePeriodMinutes : 0)
    };
  }

  function buildSchedule(routine, day) {
    var settings = getDaySettings(routine, day);
    var referenceSeconds = parseTime(settings.referenceTime);
    var totalDuration = 0;
    var startSeconds;
    var cursor;
    var scheduledSteps = [];
    var index;
    var durationSeconds;

    if (referenceSeconds === null) {
      throw new Error("Hora de referência inválida na rotina " + routine.id);
    }

    for (index = 0; index < routine.steps.length; index += 1) {
      totalDuration += routine.steps[index].durationMinutes * MINUTE_SECONDS;
    }

    startSeconds = routine.anchor === "end" ? referenceSeconds - totalDuration : referenceSeconds;
    cursor = startSeconds;

    for (index = 0; index < routine.steps.length; index += 1) {
      durationSeconds = routine.steps[index].durationMinutes * MINUTE_SECONDS;
      scheduledSteps.push({
        id: routine.steps[index].id,
        text: routine.steps[index].text,
        shortText: routine.steps[index].shortText || routine.steps[index].text,
        icon: routine.steps[index].icon,
        startSeconds: cursor,
        endSeconds: cursor + durationSeconds,
        durationSeconds: durationSeconds
      });
      cursor += durationSeconds;
    }

    return {
      routine: routine,
      settings: settings,
      steps: scheduledSteps,
      startSeconds: startSeconds,
      endSeconds: routine.anchor === "end" ? referenceSeconds : cursor
    };
  }

  function chooseSchedule(config, day, nowSeconds) {
    var routineId = arguments.length > 3 ? arguments[3] : "";
    var allRoutines = config && config.routines ? config.routines : [];
    var routines = routineId ? allRoutines : getRoutineForDay(config, day);
    var active = null;
    var overdue = null;
    var activePriority = -Infinity;
    var overduePriority = -Infinity;
    var index;
    var schedule;
    var priority;
    var graceEndSeconds;

    for (index = 0; index < routines.length; index += 1) {
      if (routineId && String(routines[index].id).toLowerCase() !== String(routineId).toLowerCase()) {
        continue;
      }

      schedule = buildSchedule(routines[index], day);
      if (routineId) {
        return schedule;
      }

      priority = typeof routines[index].priority === "number" ? routines[index].priority : 0;
      graceEndSeconds = schedule.endSeconds + Math.max(0, schedule.settings.gracePeriodMinutes) * MINUTE_SECONDS;
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

  function findNextSchedule(config, day, nowSeconds) {
    var next = null;
    var dayOffset;
    var targetDay;
    var routines;
    var index;
    var schedule;
    var absoluteStart;

    for (dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
      targetDay = (day + dayOffset) % 7;
      routines = getRoutineForDay(config, targetDay);

      for (index = 0; index < routines.length; index += 1) {
        schedule = buildSchedule(routines[index], targetDay);
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

  function formatNextSchedule(next) {
    var weekdays = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
    var dayText;

    if (!next) {
      return "";
    }
    if (next.daysAhead === 0) {
      dayText = "hoje";
    } else if (next.daysAhead === 1) {
      dayText = "amanhã";
    } else {
      dayText = weekdays[next.day];
    }
    return dayText + " · " + formatClock(next.schedule.startSeconds);
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
        if (remaining <= schedule.settings.urgentMinutes * MINUTE_SECONDS) {
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

    return function () {
      var now = new Date();
      var seconds;

      if (simulatedSeconds !== null) {
        seconds = simulatedSeconds + ((new Date().getTime() - startedAt) / SECOND);
      } else {
        seconds = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
      }

      return {
        seconds: seconds,
        day: query.day && /^[0-6]$/.test(query.day) ? Number(query.day) : now.getDay(),
        simulated: simulatedSeconds !== null || Boolean(query.routine)
      };
    };
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function renderTimeline(schedule, activeIndex) {
    var timeline = document.getElementById("timeline");
    var fragment = document.createDocumentFragment();
    var milestones = schedule.routine.milestones || [];
    var index;
    var item;
    var marker;
    var label;
    var time;
    var milestoneTime;

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
      time.textContent = formatClock(index === schedule.steps.length - 1 ? schedule.endSeconds : schedule.steps[index].startSeconds);

      item.appendChild(marker);
      item.appendChild(label);
      item.appendChild(time);
      fragment.appendChild(item);
    }

    for (index = 0; index < milestones.length; index += 1) {
      milestoneTime = parseTime(milestones[index].time);
      item = document.createElement("li");
      item.className = "timeline-step timeline-milestone";
      item.setAttribute("aria-current", "false");

      marker = document.createElement("span");
      marker.className = "timeline-icon";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = milestones[index].icon;

      label = document.createElement("span");
      label.className = "timeline-label";
      label.textContent = milestones[index].title || milestones[index].text;

      time = document.createElement("time");
      time.className = "timeline-time";
      time.textContent = milestoneTime === null ? milestones[index].time : formatClock(milestoneTime);

      item.appendChild(marker);
      item.appendChild(label);
      item.appendChild(time);
      fragment.appendChild(item);
    }
    timeline.appendChild(fragment);
  }

  function renderNoRoutine(time, nextSchedule) {
    document.body.className = "state-idle";
    setText("current-time", formatClock(time.seconds));
    setText("task-icon", "");
    setText("task-name", "SEM ROTINA ATIVA");
    setText("counter-label", nextSchedule ? "PRÓXIMA ROTINA" : "");
    setText("countdown", formatNextSchedule(nextSchedule));
    document.getElementById("timeline").innerHTML = "";
    document.getElementById("routine-indicator").hidden = true;
  }

  function render(schedule, time) {
    var state = getViewState(schedule, time.seconds);
    var bodyClass = "state-" + state.mode;
    var headline;
    var detail;

    if (state.tone) {
      bodyClass += " tone-" + state.tone;
    }
    document.body.className = bodyClass;

    setText("current-time", formatClock(time.seconds));
  setText("routine-indicator", schedule.routine.name + (time.simulated ? " · TESTE" : ""));

    if (state.mode === "before") {
      setText("task-icon", schedule.routine.icon || "☀️");
      setText("task-name", "AINDA NÃO COMEÇOU");
      setText("counter-label", "COMEÇA ÀS");
      setText("countdown", formatClock(schedule.startSeconds));
    } else if (state.mode === "active") {
      setText("task-icon", state.step.icon);
      setText("task-name", state.step.text);
      setText("counter-label", state.tone === "urgent" ? "DESPACHA-TE" : "TEMPO RESTANTE");
      setText("countdown", formatCountdown(state.remainingSeconds));
    } else {
      headline = state.mode === "overdue" ? "JÁ DEVÍAMOS TER SAÍDO" : "É HORA DE SAIR";
      detail = schedule.steps[schedule.steps.length - 1];
      setText("task-icon", detail.icon);
      setText("task-name", headline);
      setText("counter-label", state.mode === "overdue" ? "ATRASO" : "SAÍDA");
      setText("countdown", state.mode === "overdue" ? formatElapsed(state.elapsedSeconds) : formatClock(schedule.endSeconds));
    }

    renderTimeline(schedule, state.activeIndex);
    document.getElementById("routine-indicator").hidden = false;
  }

  function start() {
    var config = window.ROUTINE_CONFIG;
    var query = readQuery();
    var getTime = createTimeSource(query);

    function update() {
      var time = getTime();
      var schedule = chooseSchedule(config, time.day, time.seconds, query.routine);
      setText("current-date", formatDate(new Date()));
      handleSoundAlerts(schedule, time.seconds, config.sounds);
      if (schedule) {
        render(schedule, time);
      } else {
        renderNoRoutine(time, findNextSchedule(config, time.day, time.seconds));
      }
    }

  setupSoundControl(config.sounds);
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
    buildSchedule: buildSchedule,
    getViewState: getViewState,
    chooseSchedule: chooseSchedule,
    findNextSchedule: findNextSchedule,
    formatNextSchedule: formatNextSchedule
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", start);
    } else {
      start();
    }
  }
}());
