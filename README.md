# Painel de rotinas

Painel visual estático para mostrar a hora, a etapa esperada, o tempo restante e a sequência completa de uma rotina. Funciona diretamente no browser, sem backend, instalação ou dependências.

## Abrir e testar

Abra `index.html` no Safari ou noutro browser. O painel usa a hora e o dia do dispositivo.

Pode simular uma hora acrescentando `?time=HH:MM` ao endereço:

- `index.html?time=06:52`
- `index.html?time=07:07`
- `index.html?time=07:18`

A hora simulada começa no valor indicado e continua a avançar a cada segundo. Para simular também um dia específico, use `day=0` para domingo até `day=6` para sábado. Por exemplo, `index.html?time=07:20&day=3` testa uma quarta-feira.

A data apresentada usa sempre a data real do dispositivo. Os parâmetros `time` e `day` continuam a afetar apenas o teste da rotina e da hora.

Pode forçar uma rotina pelo respetivo `id`, mesmo fora do dia ou horário configurado:

- `index.html?routine=manha-escola`
- `index.html?routine=jantar`
- `index.html?routine=jantar&time=19:42`

O segundo e terceiro exemplos funcionam depois de existir em `config.js` uma rotina com `id: "jantar"`. Um ID inexistente mostra o ecrã neutro.

## Configurar a meteorologia

A secção `weather` de `config.js` controla a meteorologia atual:

```js
weather: {
  enabled: true,
  latitude: 38.7223,
  longitude: -9.1393,
  refreshMinutes: 10
}
```

As coordenadas iniciais correspondem a Lisboa. Altere `latitude` e `longitude` para a localização pretendida. Para desligar completamente a funcionalidade e impedir pedidos à Open-Meteo, use `enabled: false`.

Os dados são atualizados segundo `refreshMinutes` e o último resultado válido é mantido em memória enquanto a página estiver aberta. Se a rede ou a API falhar antes de existir um resultado válido, apenas a meteorologia fica escondida; o painel continua a funcionar normalmente.

## Alterar a hora de saída

Edite `referenceTime` em `config.js`:

```js
referenceTime: "07:35"
```

Como a rotina usa `anchor: "end"`, todas as etapas anteriores deslocam-se automaticamente, mantendo as durações.

Para alterar apenas uma quarta-feira, use a chave `3` em `dayOverrides`:

```js
dayOverrides: {
  "3": { referenceTime: "07:35" }
}
```

## Alterar durações e avisos

Cada etapa tem `durationMinutes`. O passo final pode ter duração zero porque representa o momento de saída:

```js
{
  id: "dress",
  text: "VESTIR",
  shortText: "Vestir",
  icon: "👕",
  durationMinutes: 10
}
```

`warningMinutes` controla o aviso amarelo e `urgentMinutes` controla o aviso vermelho. `gracePeriodMinutes` mantém a rotina visível no estado “JÁ DEVÍAMOS TER SAÍDO” durante o número de minutos indicado depois da hora de fim.

No minuto exato da hora final, o painel mostra “É HORA DE SAIR” e mantém essa hora no centro. A partir do minuto seguinte, mostra “JÁ DEVÍAMOS TER SAÍDO” e um contador `ATRASO` crescente. Quando termina `gracePeriodMinutes`, a rotina deixa de estar ativa.

## Adicionar uma rotina

Acrescente outro objeto ao array `window.ROUTINE_CONFIG.routines` em `config.js`. Cada rotina aceita:

- `id`: identificador único.
- `name` e `icon`: título e ícone do cabeçalho.
- `priority`: número opcional usado para resolver sobreposições; o valor mais alto ganha e o valor predefinido é `0`.
- `days`: dias ativos, de `0` (domingo) a `6` (sábado).
- `referenceTime`: hora `HH:MM` usada como referência.
- `anchor`: `"end"` para calcular para trás ou `"start"` para calcular para a frente.
- `warningMinutes` e `urgentMinutes`: limites visuais do contador.
- `gracePeriodMinutes`: tolerância opcional depois do fim; o valor predefinido é `0`.
- `dayOverrides`: alterações opcionais por dia da semana.
- `steps`: etapas com `id`, `text`, `shortText`, `icon` e `durationMinutes`.
- `milestones`: marcos visuais opcionais com `id`, `title`, `icon` e uma `time` independente.

Exemplo mínimo de uma rotina com âncora de início:

```js
{
  id: "jantar",
  name: "JANTAR",
  icon: "🍽️",
  priority: 5,
  days: [0, 1, 2, 3, 4, 5, 6],
  referenceTime: "19:30",
  anchor: "start",
  warningMinutes: 5,
  urgentMinutes: 2,
  gracePeriodMinutes: 15,
  dayOverrides: {},
  steps: [
    {
      id: "dinner-table",
      text: "JANTAR",
      shortText: "Jantar",
      icon: "🍽️",
      durationMinutes: 30
    }
  ],
  milestones: [
    {
      id: "bedtime",
      title: "Dormir",
      icon: "🛏️",
      time: "21:30"
    }
  ]
}
```

As milestones aparecem no fim da timeline pela ordem configurada. Não têm duração, não alteram os horários calculados das etapas e nunca se tornam a tarefa central ou recebem o destaque de etapa atual.

Em utilização normal, o painel compara o dia e a hora atual com o início, o fim e a tolerância calculados de todas as rotinas. Durante a tolerância mantém a timeline visível no estado atrasado. Uma rotina realmente em curso tem precedência sobre outra que esteja apenas em tolerância; entre rotinas no mesmo estado, vence a maior `priority`. Depois da tolerância, a rotina desaparece. Fora de qualquer rotina, mostra “SEM ROTINA ATIVA” e indica discretamente o dia e a hora de início da próxima rotina, sem exigir seleção manual.

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie estes ficheiros para a raiz do ramo principal.
2. No GitHub, abra **Settings > Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione o ramo principal, a pasta `/ (root)` e clique em **Save**.
5. Abra o endereço apresentado pelo GitHub quando a publicação terminar.

## Compatibilidade

A aplicação usa HTML, CSS e JavaScript clássicos, sem módulos, `fetch`, frameworks, npm ou bibliotecas externas. Não usa optional chaining nem nullish coalescing e foi escrita para Safari no iOS 12. Pode funcionar servida pelo GitHub Pages ou aberta diretamente a partir dos ficheiros locais.
