# Painel de fases do dia

Painel visual estático para mostrar a fase atual do dia. Fases `sequence` apresentam etapas e contadores; fases `passive` mostram apenas informação contextual. Funciona diretamente no browser, sem backend, instalação ou dependências.

## Abrir e testar

Abra `index.html` no Safari ou noutro browser. O painel usa a hora e o dia do dispositivo.

Pode simular uma hora acrescentando `?time=HH:MM` ao endereço:

- `index.html?time=06:45`
- `index.html?time=18:15`
- `index.html?time=20:55`

A hora simulada começa no valor indicado e continua a avançar a cada segundo. Para simular também um dia específico, use `day=0` para domingo até `day=6` para sábado. Por exemplo, `index.html?time=07:20&day=3` testa uma quarta-feira.

Com `day`, a data apresentada ajusta-se ao dia escolhido dentro da semana atual. Sem `day`, permanece a data real do dispositivo.

Pode forçar uma fase pelo respetivo `id`, mesmo fora do dia ou horário configurado:

- `index.html?phase=manha-escola`
- `index.html?phase=manha-escola-quinta&time=08:05`

Um ID inexistente mostra o ecrã neutro. O parâmetro antigo `routine` continua aceite como alias para não quebrar endereços guardados.

## Configurar a meteorologia

A secção `weather` de `config.js` controla a meteorologia atual:

```js
weather: {
  enabled: true,
  useCurrentLocation: true,
  locationLabel: "Lisboa",
  latitude: 38.7223,
  longitude: -9.1393,
  precipitationThreshold: 0.1,
  apparentTemperatureDifference: 3,
  refreshMinutes: 10
}
```

Com `useCurrentLocation: true`, o browser pede autorização para usar a localização atual. Se for autorizada, as coordenadas reais passam a ser usadas nas consultas seguintes e o cabeçalho mostra **Localização atual** entre a temperatura e o controlo de som. As coordenadas configuradas correspondem a Lisboa e funcionam como fallback quando a geolocalização não está disponível, é recusada ou excede o tempo limite; `locationLabel` define o nome apresentado nesse caso. Use `useCurrentLocation: false` para usar sempre as coordenadas configuradas. Para desligar completamente a funcionalidade e impedir pedidos à Open-Meteo, use `enabled: false`.

A geolocalização funciona no GitHub Pages através de HTTPS. Ao abrir diretamente como `file://`, alguns browsers podem bloqueá-la; nesse caso, o fallback continua ativo.

Os dados são atualizados segundo `refreshMinutes` e o último resultado válido é mantido em memória enquanto a página estiver aberta. Se a rede ou a API falhar antes de existir um resultado válido, apenas a meteorologia fica escondida; o painel continua a funcionar normalmente.

`precipitationThreshold` define a precipitação mínima apresentada e `apparentTemperatureDifference` define a diferença mínima para mostrar a sensação térmica.

## Alertas sonoros

A secção `sounds` de `config.js` controla os alertas de aviso, urgência, mudança de etapa e hora de saída. Cada padrão permite definir `enabled`, `beeps`, `frequency`, `durationMs` e `gapMs`. Os momentos dos alertas usam `warningMinutes` e `urgentMinutes` da phase atual, tal como os estados visuais. `volume` define o volume geral entre `0` e `1`.

No Safari do iPad, toque em **🔊 Ativar som** depois de abrir a página. O browser exige esta interação antes de permitir áudio. A autorização dura enquanto a página permanecer aberta; se a página for fechada ou recarregada, poderá ser necessário ativar novamente.

Para esconder o controlo e impedir a criação do `AudioContext` e toda a lógica de alertas, use:

```js
sounds: {
  enabled: false
}
```

Os alertas tocam uma única vez ao atravessar cada limiar. Abrir ou recarregar a página a meio de uma etapa não produz imediatamente sons relativos a eventos passados. Uma step pode usar `startSound` com o nome de um padrão definido em `sounds`; caso contrário, a mudança usa `stepChange`. A step `to-school` usa `startSound: "leaveTime"` para o aviso forte de saída de casa.

## Alterar a hora de referência

Edite `referenceTime` em `config.js`:

```js
referenceTime: "08:00"
```

Como a fase usa `anchor: "end"`, todas as etapas anteriores deslocam-se automaticamente, mantendo as durações.

Para alterar a referência e uma etapa apenas à quinta-feira, use a chave `4` em `dayOverrides`. `stepOverrides` aceita qualquer `id` de step e substitui apenas as propriedades indicadas:

```js
dayOverrides: {
  "4": {
    referenceTime: "08:55",
    stepOverrides: {
      "to-school": { durationMinutes: 35 }
    }
  }
}
```

## Alterar durações e avisos

Cada etapa tem `durationMinutes`. O passo final pode ter duração zero quando representa um momento exato, como sair:

```js
{
  id: "dress",
  text: "VESTIR",
  shortText: "Vestir",
  icon: "👕",
  durationMinutes: 10
}
```

`warningMinutes` controla o aviso amarelo e `urgentMinutes` controla o aviso vermelho. Uma etapa com `pressureMode: "none"` continua a mostrar o tempo restante, mas sem estado visual ou som de warning/urgent. `gracePeriodMinutes` mantém a fase `sequence` visível no estado atrasado depois da hora de fim.

Durante o minuto da hora final, o painel mostra o step de duração zero e mantém essa hora no centro. Se existir tolerância, a partir do minuto seguinte mostra o estado atrasado e um contador crescente. Quando termina `gracePeriodMinutes`, a fase deixa de estar ativa.

## Configurar fases

Acrescente objetos ao array `window.ROUTINE_CONFIG.dayPhases` em `config.js`. Todas as fases aceitam:

- `id`: identificador único.
- `name` e `icon`: título e ícone da fase.
- `displayMode`: `"sequence"` ou `"passive"`.
- `enabled`: use `false` para manter uma fase incompleta na configuração sem a apresentar nem a considerar como próxima fase.
- `priority`: número opcional usado para resolver sobreposições; o valor mais alto ganha e o valor predefinido é `0`.
- `days`: dias ativos, de `0` (domingo) a `6` (sábado).
- `dayOverrides`: alterações opcionais por dia da semana.

Uma fase `sequence` aceita ainda:

- `referenceTime`: hora `HH:MM` usada como referência.
- `anchor`: `"end"` para calcular para trás ou `"start"` para calcular para a frente.
- `warningMinutes` e `urgentMinutes`: limites visuais do contador.
- `gracePeriodMinutes`: tolerância opcional depois do fim; o valor predefinido é `0`.
- `steps`: etapas com `id`, `text`, `shortText`, `icon` e `durationMinutes`; `pressureMode: "none"` é opcional.
- `dayOverrides[day].stepOverrides`: alterações opcionais às propriedades de qualquer step, identificada pelo respetivo `id`.

Exemplo mínimo de uma fase `sequence` com âncora de início:

```js
{
  id: "nova-sequencia",
  name: "NOVA SEQUÊNCIA",
  icon: "▶️",
  displayMode: "sequence",
  priority: 5,
  days: [0, 1, 2, 3, 4, 5, 6],
  referenceTime: "HH:MM",
  anchor: "start",
  warningMinutes: 5,
  urgentMinutes: 2,
  gracePeriodMinutes: 15,
  dayOverrides: {},
  steps: [
    {
      id: "primeira-etapa",
      text: "PRIMEIRA ETAPA",
      shortText: "Primeira etapa",
      icon: "▶️",
      durationMinutes: 30
    }
  ]
}
```

Uma fase `passive` usa `startTime` e `endTime`. Se `endTime` for `null`, a configuração é considerada incompleta: não se torna ativa automaticamente, mas pode aparecer como próxima fase quando `startTime` for válido. O browser emite apenas um `console.warn`. Uma fase passive não tem steps, timeline, warnings, urgência, grace period ou sons:

```js
{
  id: "nova-fase-passiva",
  name: "NOVA FASE",
  icon: "ℹ️",
  displayMode: "passive",
  priority: 5,
  days: [1, 2, 3, 4, 5],
  startTime: "HH:MM",
  endTime: "HH:MM",
  dayOverrides: {
    "3": { startTime: "HH:MM", endTime: "HH:MM" }
  }
}
```

Durante uma fase `sequence`, a próxima dayPhase válida aparece apenas no fim da timeline, com tratamento visual secundário. Durante uma fase `passive` ou no estado idle, aparece no bloco **Próximo** abaixo da informação principal. Se não existir uma próxima fase, nenhum destes elementos é apresentado.

Nos dias úteis, a Manhã inclui a deslocação sem pressão e termina quando começa Escola: `08:00` nos dias normais e `08:55` à quinta-feira. Escola é uma fase passive até às `17:30` e Fim do dia é uma sequência das `18:30` às `22:00`, calculada para trás a partir da hora de dormir. Dormir é uma fase passive autónoma, ativa diariamente das `22:00` às `06:30`, incluindo a passagem da meia-noite. Ao sábado, a Manhã termina com a deslocação sem pressão e Inglês fica ativo das `09:30` às `11:00`.

Em utilização normal, o painel compara o dia e a hora atual com o início, o fim e a tolerância calculados de todas as fases. Durante a tolerância de uma fase `sequence`, mantém a timeline visível no estado atrasado. Uma fase realmente em curso tem precedência sobre outra que esteja apenas em tolerância; entre fases no mesmo estado, vence a maior `priority`.

Fora de uma fase, a secção `idle` controla a apresentação calma do intervalo:

```js
idle: {
  preRoutineMinutes: 30,
  showNextRoutine: true
}
```

O painel mostra **Bom dia**, **Boa tarde** ou **Boa noite** conforme os limites configurados em `greetings`. A próxima fase é apresentada quando `showNextRoutine` está ativo; durante os últimos `preRoutineMinutes`, a saudação recebe o destaque visual de proximidade. `showNextRoutine: false` esconde os detalhes da próxima fase.

Os textos da interface podem ser alterados na secção `labels`; se uma chave for omitida, o motor usa o texto português predefinido. Os limites das saudações usam:

```js
greetings: {
  morningUntil: "12:00",
  afternoonUntil: "20:00"
}
```

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie estes ficheiros para a raiz do ramo principal.
2. No GitHub, abra **Settings > Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione o ramo principal, a pasta `/ (root)` e clique em **Save**.
5. Abra o endereço apresentado pelo GitHub quando a publicação terminar.

## Compatibilidade

A aplicação usa HTML, CSS e JavaScript clássicos, sem módulos, `fetch`, frameworks, npm ou bibliotecas externas. Não usa optional chaining nem nullish coalescing e foi escrita para Safari no iOS 12. Pode funcionar servida pelo GitHub Pages ou aberta diretamente a partir dos ficheiros locais.
