// Compact word -> emoji map. All keys lowercase. Used for instant first-paint.
// Format: word|emoji  (one entry per line for easy scanning and appending)
// Empty lines and lines starting with # are comments.
export const WORD_EMOJI = `
// === People & Body ===
person|🧑|man|👨|woman|👩|boy|👦|girl|👧|baby|👶|child|🧒|friend|🤝|family|👪|people|👥|human|🧑|king|👑|queen|👑|prince|🤴|princess|👸|hero|🦸|teacher|🧑‍🏫|student|🧑‍🎓|doctor|🧑‍⚕️|artist|🧑‍🎨|scientist|🧑‍🔬|chef|🧑‍🍳|farmer|🧑‍🌾|worker|👷|driver|🚗|soldier|🎖️|police|👮|singer|🎤
hand|✋|foot|🦶|eye|👁️|ear|👂|nose|👃|mouth|👄|heart|❤️|brain|🧠|head|🗿|arm|💪|leg|🦵|finger|☝️|hair|💇|skin|🏳️
// === Animals ===
cat|🐱|dog|🐶|bird|🐦|fish|🐟|horse|🐴|cow|🐄|pig|🐖|sheep|🐑|rabbit|🐰|mouse|🐭|tiger|🐯|lion|🦁|elephant|🐘|bear|🐻|panda|🐼|monkey|🐵|fox|🦊|wolf|🐺|deer|🦌|chicken|🐔|duck|🦆|eagle|🦅|owl|🦉|butterfly|🦋|bee|🐝|spider|🕷️|snake|🐍|turtle|🐢|frog|🐸|whale|🐋|dolphin|🐬|shark|🦈|octopus|🐙|crab|🦀|ant|🐜|dragon|🐉|dinosaur|🦖
// === Food & Drink ===
food|🍽️|water|💧|bread|🍞|rice|🍚|meat|🍖|egg|🥚|milk|🥛|tea|🍵|coffee|☕|juice|🧃|beer|🍺|wine|🍷|cake|🎂|candy|🍬|chocolate|🍫|cookie|🍪|pizza|🍕|burger|🍔|sandwich|🥪|apple|🍎|banana|🍌|orange|🍊|grape|🍇|strawberry|🍓|watermelon|🍉|peach|🍑|lemon|🍋|cherry|🍒|pineapple|🍍|vegetable|🥕|carrot|🥕|tomato|🍅|potato|🥔|corn|🌽|salt|🧂|sugar|🍬|honey|🍯|soup|🍲|noodle|🍜|fruit|🍎|breakfast|🥞|lunch|🍱|dinner|🍽️|meal|🍽️|drink|🥤|bottle|🍾|cup|☕|bowl|🥣
// === Nature ===
sun|☀️|moon|🌙|star|⭐|sky|🌌|cloud|☁️|rain|🌧️|snow|❄️|wind|🌬️|storm|⛈️|rainbow|🌈|fire|🔥|ice|🧊|earth|🌍|planet|🪐|mountain|⛰️|hill|⛰️|valley|🏞️|forest|🌲|tree|🌳|flower|🌸|rose|🌹|grass|🌱|leaf|🍃|seed|🌱|root|🌳|river|🌊|lake|🏞️|ocean|🌊|sea|🌊|beach|🏖️|island|🏝️|stone|🪨|rock|🪨|sand|🏜️|mud|🥟|dust|💨|wave|🌊
// === House & Objects ===
house|🏠|home|🏡|door|🚪|window|🪟|roof|🏠|room|🏠|kitchen|🍽️|bed|🛏️|chair|🪑|table|🍽️|lamp|💡|clock|🕐|watch|⌚|mirror|🪞|key|🗝️|lock|🔒|bag|👜|box|📦|bottle|🍾|cup|☕|bowl|🥣|plate|🍽️|spoon|🥄|knife|🔪|fork|🍴|book|📖|pen|🖋️|pencil|✏️|paper|📄|letter|✉️|mail|✉️|card|💧|map|🗺️|gift|🎁|ball|⚽|toy|🧸|doll|🧸|kite|🪁|balloon|🎈|flag|🚩|umbrella|☂️
// === Clothes ===
clothes|👚|shirt|👕|pants|👖|dress|👗|shoes|👟|hat|🎩|glove|🧤|coat|🧥|scarf|🧣|ring|💍|sock|🧦|shoe|👟|glass|👓|glasses|👓
// === Tech & Tools ===
phone|📱|computer|💻|laptop|💻|keyboard|⌨️|screen|📱|camera|📷|television|📺|radio|📻|light|💡|battery|🔋|cable|🎞️|tool|🔧|hammer|🔨|saw|🪚|scissors|✂️|needle|🪡|thread|🧵|rope|🪢|glue|🧴|paint|🎨|brush|🖌️|knife|🔪|clock|🕐
// === Vehicles ===
car|🚗|bus|🚌|taxi|🚕|truck|🚚|bike|🚲|bicycle|🚲|motorcycle|🏍️|train|🚂|plane|✈️|airplane|✈️|ship|🚢|boat|⛵|rocket|🚀
// === Buildings & Places ===
school|🏫|hospital|🏥|store|🏪|shop|🏪|market|🏪|bank|🏦|church|⛪|temple|🗼|mosque|🕌|factory|🏭|office|🏢|library|📚|museum|🏛️|theater|🎭|cinema|🎬|stadium|🏟️|park|🏞️|garden|🌷|farm|🌾|city|🏙️|town|🏘️|village|🏘️|street|🛣️|road|🛣️|bridge|🌉|tower|🗼|castle|🏰|palace|🏰|wall|🧱|restaurant|🍽️|hotel|🏨|airport|🛫
// === Money & Documents ===
money|💰|cash|💵|coin|🪙|dollar|💵|price|💲|bill|💵|document|📄|file|📁|report|📊|ticket|🎫|passport|🛂|license|📜|contract|📜|certificate|📜|menu|📖|account|📋
// === Abstract nouns ===
dream|💭|idea|💡|thought|💭|memory|📜|secret|🤫|story|📖|joke|🤣|game|🎮|song|🎵|music|🎵|film|🎬|movie|🎬|news|📰|advertisement|📣|message|💬|email|✉️|text|💬|call|📞|voice|🗣️|sound|🔊|noise|📢|signal|📶|picture|🖼️|photo|📷|image|🖼️|art|🎨|color|🎨|shape|⚫|line|📐|circle|⚪|square|⬛|triangle|🔺
problem|❓|question|❓|answer|✅|solution|💡|risk|⚠️|danger|⚠️|opportunity|🌟|challenge|🧗|success|🏆|failure|💥|goal|🥅|plan|📋|rule|📏|law|⚖️|truth|✅|fact|📌|opinion|💭|reason|🧠|cause|🔗|effect|💥|result|🏁|future|🔮|past|⏪|present|🎁|history|📜|power|⚡|energy|⚡|force|💪|strength|💪|weakness|🕳️|health|❤️|wealth|💰|happiness|😊|sadness|😢|anger|😠|fear|😱|love|❤️|peace|☮️|war|⚔️|freedom|🕊️|justice|⚖️|honor|🏅
// === Time ===
time|⏰|hour|🕐|minute|⏱️|second|⏱️|day|📅|night|🌙|morning|🌅|afternoon|🌇|evening|🌆|today|📅|tomorrow|➡️|yesterday|⬅️|week|📅|month|📅|year|📅|century|🏛️|age|👴
monday|📅|tuesday|📅|wednesday|📅|thursday|📅|friday|📅|saturday|📅|sunday|📅|january|❄️|february|❤️|march|🌱|april|🌧️|may|🌸|june|☀️|july|☀️|august|☀️|september|🍂|october|🎃|november|🍁|december|🎄|spring|🌸|summer|☀️|autumn|🍂|fall|🍂|winter|❄️|season|🌦️
// === Directions & Movement ===
left|⬅️|right|➡️|up|⬆️|down|⬇️|forward|➡️|back|⬅️|north|⬆️|south|⬇️|east|➡️|west|⬅️|middle|⏺️|center|⏺️|top|⬆️|bottom|⬇️
// === Verbs - Motion ===
run|🏃|walk|🚶|jump|🤸|swim|🏊|fly|🪽|climb|🧗|crawl|🐛|ride|🚴|drive|🚗|sail|⛵|race|🏁|chase|🏃|follow|👣|lead|🚩|arrive|🏁|leave|🚪|enter|🚪|exit|🚪|return|🔁|approach|🚶|depart|✈️|go|➡️|come|⬅️|stop|🛑|wait|⏳|continue|➡️|move|➡️
// === Verbs - Actions ===
eat|🍴|drink|🥤|sleep|😴|read|📖|write|✍️|speak|🗣️|listen|👂|watch|👀|look|👀|see|👀|hear|👂|feel|✋|touch|✋|taste|👅|smell|👃|think|💭|know|🧠|believe|🙏|remember|🧠|forget|❓|learn|📚|teach|👨‍🏫|study|📚|understand|💡|realize|💡|imagine|💭|dream|💭|create|🎨|build|🔨|make|🛠️|fix|🔧|break|💔|destroy|💥|kill|💀|save|💾|protect|🛡️|attack|⚔️|fight|🥊|win|🏆|lose|💔|succeed|🏆|fail|💥|try|💪|attempt|💪|succeed|🏆
open|🔓|close|🔒|push|➡️|pull|⬅️|lift|🏋️|drop|⬇️|throw|🤾|catch|🥅|hold|✋|release|🫳|grab|✊|carry|📦|bring|👜|take|✋|give|🎁|send|📤|receive|📥|buy|🛒|sell|🏷️|pay|💵|cost|💲|spend|💸|earn|💰|borrow|🤝|lend|🤝|share|🤝|steal|🦹|keep|🔐|lose|❓|find|🔍|search|🔍|discover|🔍|hide|🙈|show|👀|reveal|💡
// === Verbs - Communication ===
say|💬|tell|💬|ask|❓|answer|✅|call|📞|shout|📢|whisper|🤫|sing|🎤|laugh|😂|cry|😭|smile|😊|scream|😱|talk|💬|discuss|💬|explain|💬|describe|💬|argue|🤬|agree|🤝|disagree|❌|promise|🤞|warn|⚠️|advise|💡|suggest|💡|recommend|👍|invite|💌|introduce|🤝
start|▶️|stop|⏹️|begin|▶️|end|⏹️|finish|✅|continue|➡️|pause|⏸️|repeat|🔁|change|🔄|replace|🔄|remove|🗑️|add|➕|increase|📈|decrease|📉|grow|🌱|shrink|🤏|expand|📈|reduce|📉|improve|📈|worsen|📉
// === Verbs - Mental ===
love|❤️|like|👍|hate|💔|want|🙏|need|🙏|hope|🌟|wish|🌠|enjoy|😄|prefer|👍|choose|👉|decide|✅|plan|📋|consider|🤔|compare|⚖️|judge|⚖️|guess|🤔|expect|🔮|suppose|🤔|assume|🤔|mean|💭|suggest|💡|realize|💡
// === Adjectives - Common ===
good|👍|bad|👎|great|🌟|perfect|💯|excellent|🏆|terrible|💀|awful|🤮|wonderful|✨|amazing|🤩|fantastic|🦄|nice|😊|fine|👌|ok|👌|best|🥇|worst|💀|better|📈|worse|📉
big|🐘|small|🐭|large|🐘|tiny|🤏|huge|🐘|little|🤏|tall|🦒|short|🤏|long|📏|wide|↔️|narrow|↕️|deep|🕳️|shallow|🤏|high|⛰️|low|⬇️
hot|🔥|cold|❄️|warm|☀️|cool|🧊|fast|⚡|slow|🐌|quick|⚡|rapid|⚡|swift|⚡|new|✨|old|👴|young|👶|fresh|🌱|ancient|🏛️|modern|✨|clean|🧼|dirty|🤢|wet|💧|dry|🏜️|empty|📭|full|🍽️|heavy|🏋️|light|🪶|hard|🪨|soft|🧸|strong|💪|weak|🕳️
beautiful|🌹|ugly|🤢|pretty|🌸|cute|🥰|lovely|💕|handsome|🤴|attractive|✨|elegant|👗|fancy|✨|simple|🤍|plain|🤍
happy|😊|sad|😢|angry|😠|excited|🤩|surprised|😮|scared|😱|afraid|😨|brave|🦁|shy|😳|proud|🦚|ashamed|😳|jealous|😒|envious|😒|nervous|😰|calm|🧘|relaxed|😌|peaceful|☮️|cheerful|😊|glad|😊|delighted|🤩|pleased|😊|satisfied|😌|disappointed|😞|frustrated|😤|confused|😕|curious|🤔|interested|🤔|bored|😑|tired|😴|sleepy|😴|awake|😊|alive|💓|dead|💀
// === Adjectives - Quality ===
important|⭐|necessary|✅|essential|🧬|useful|🛠️|helpful|🤝|valuable|💎|precious|💎|expensive|💰|cheap|🪙|rare|💎|common|🔁|normal|😐|special|⭐|strange|🤔|unusual|🤔|peculiar|🤔|different|🔄|similar|🟰|same|🟰|equal|🟰|fair|⚖️|unfair|❌|true|✅|false|❌|real|✅|fake|❌|correct|✅|wrong|❌|right|✅
easy|😊|hard|🪨|difficult|🪨|simple|🤍|complex|🧩|complicated|🧩|clear|🔆|obvious|👀|obscure|🌫️|visible|👀|invisible|❓|obvious|👀|famous|⭐|unknown|❓|popular|🌟|ordinary|😐|famous|⭐|standard|📏|basic|📦|advanced|🚀|modern|✨|traditional|🏛️
rich|💰|poor|🪙|wealthy|💰|generous|🤝|kind|🤗|cruel|😈|mean|😠|nice|😊|rude|🤬|polite|🙏|rude|🤬|gentle|🕊️|rough|🪨|smooth|✨|sharp|🔪|dull|🤏|sweet|🍬|sour|🍋|bitter|☕|salty|🧂|spicy|🌶️|soft|🧸|loud|📢|quiet|🤫|silent|🤫|noisy|📢|busy|🏃|free|🕊️|open|🔓|closed|🔒
// === Adjectives - Abstract ===
smart|🧠|intelligent|🧠|clever|🧠|wise|🦉|stupid|🤡|foolish|🤡|silly|🤪|serious|😐|funny|🤣|humorous|🤣|amusing|😄|boring|😴|interesting|🤔|exciting|🤩|amazing|🤩
safe|🛡️|dangerous|⚠️|risky|⚠️|healthy|❤️|ill|🤒|sick|🤒|well|👍|alive|💓|dead|💀|true|✅|false|❌|right|✅|wrong|❌
// === Academic / GRE core (academic word list subset) ===
analysis|🔍|analyses|🔍|analyst|🔍|context|📌|concept|💡|theory|🧪|method|🧪|approach|🧭|strategy|♟️|framework|🪟|perspective|👁️|principle|⚖️|criterion|✅|criteria|✅|evidence|🔎|data|📊|statistics|📊|phenomenon|🌌|process|⚙️|procedure|📋|structure|🏛️|system|⚙️|mechanism|⚙️|component|🧩|element|⚛️|factor|🧮|variable|📈|outcome|🎯|impact|💥|effect|💥|consequence|➡️|trend|📈|pattern|🧩|category|🗂️|instance|🔹|example|🔹|characteristic|✨|feature|✨|function|⚙️|role|🎭|purpose|🎯|significance|⭐|influence|🌊|implication|🤔|interpretation|🗣️|assessment|📋|evaluation|✅|conclusion|📌|assumption|🤔|hypothesis|🧪|theory|🧪|definition|📖
// === Reasoning / Logic ===
reason|🧠|reasoning|🧠|logic|🧩|logical|🧩|rational|🧠|rationale|🧠|deductive|➡️|inductive|↔️|infer|🔍|inference|🔍|deduce|➡️|conclude|📌|generalize|🌐|specific|🔹|abstract|🌀|complex|🧩|complicated|🧩|simple|🤍|fundamental|🏛️|essential|🧬|critical|⚠️|crucial|⚠️|significant|⭐|relevant|🎯|irrelevant|❌
// === Culture / Society ===
culture|🏛️|cultural|🏛️|tradition|🏮|custom|🏮|ritual|🕯️|ceremony|🎎|festival|🎉|religion|🛕|belief|🙏|faith|🙏|myth|📜|legend|🐉|history|📜|historical|📜|modern|✨|ancient|🏛️|contemporary|✨|generation|👥|community|👥|society|🏙️|civilization|🏛️|empire|👑|dynasty|👑|revolution|✊|reform|🔄|movement|🚶|progress|📈|decline|📉|crisis|⚠️|conflict|⚔️|peace|☮️|war|⚔️|violence|💥|protest|✊
// === Politics / Economy ===
politics|🏛️|political|🏛️|government|🏛️|policy|📋|law|⚖️|regulation|📋|authority|👑|power|⚡|democracy|🗳️|election|🗳️|vote|🗳️|party|🎉|parliament|🏛️|congress|🏛️|president|👨‍|citizen|👤|freedom|🕊️|rights|📜|economy|💹|economic|💹|market|🏪|industry|🏭|company|🏢|corporation|🏢|business|💼|trade|🤝|commerce|🤝|finance|💹|investment|💰|profit|💰|loss|📉|tax|💰|budget|📋|income|💵|salary|💵|wage|💵|wealth|💰|poverty|🪙|employment|💼|unemployment|📉
// === Psychology / Emotion ===
emotion|💗|emotional|💗|feeling|💗|mood|😊|attitude|🙂|opinion|💭|perception|👁️|belief|🙏|desire|❤️|passion|🔥|motivation|🔥|inspiration|✨|confidence|💪|doubt|🤔|anxiety|😰|stress|😰|depression|😞|trauma|💔|memory|🧠|consciousness|🧠|personality|🎭|character|🎭|behavior|🚶|behaviour|🚶|instinct|🦅|intuition|🔮|imagination|💭|creativity|🎨|talent|🌟|genius|🧠|wisdom|🦉
// === Education ===
learn|📚|learning|📚|teach|👨‍🏫|teacher|👨‍🏫|student|🧑‍🎓|education|🎓|school|🏫|university|🎓|college|🎓|class|🏫|lesson|📖|course|📚|curriculum|📚|degree|🎓|graduate|🎓|exam|📝|test|📝|quiz|❓|homework|📓|assignment|📓|research|🔬|study|📚|scholar|🦉|academic|🎓|professor|👨‍🏫|lecture|🎤|seminar|👥|workshop|🔨
// === Work / Career ===
work|💼|job|💼|career|💼|profession|💼|office|🏢|meeting|👥|project|📋|task|✅|deadline|⏰|goal|🥅|achievement|🏆|success|🏆|failure|💔|promotion|📈|salary|💵|interview|💬|resume|📄|colleague|👥|boss|👔|manager|👔|team|👥|client|🤝|customer|🤝|partner|🤝|service|🛎️
// === Tech / Digital ===
software|💻|hardware|🖥️|computer|💻|program|💻|code|💻|coding|💻|developer|👨‍💻|engineer|👷|algorithm|🧮|data|📊|database|🗄️|network|🌐|internet|🌐|website|🌐|app|📱|digital|📱|technology|⚙️|tech|⚙️|system|⚙️|platform|🏗️|tool|🔧|machine|⚙️|device|📱|robot|🤖|ai|🤖|artificial|🤖
// === Home / Family ===
home|🏡|house|🏠|family|👪|parent|👨‍👩‍👧|child|🧒|son|👦|daughter|👧|father|👨|mother|👩|brother|👦|sister|👧|grandfather|👴|grandmother|👵|baby|👶|marriage|💍|wife|👰|husband|🤵|friend|🤝|neighbor|🏘️|guest|🛎️|relative|👥|generation|👥|ancestor|🌳|descendant|🌱
// === Body & Health ===
body|🧍|head|🗿|face|😊|eye|👁️|ear|👂|mouth|👄|nose|👃|tooth|🦷|tongue|👅|hair|💇|skin|🧴|blood|🩸|bone|🦴|muscle|💪|brain|🧠|heart|❤️|lung|🫁|stomach|🫃|doctor|🧑‍⚕️|nurse|🧑‍⚕️|medicine|💊|pill|💊|hospital|🏥|clinic|🏥|surgery|🩺|pain|😣|fever|🤒|cough|😷|injury|🤕|wound|🩹|health|❤️|exercise|🏃|sport|⚽|sleep|😴|rest|🛌|diet|🥗
// === Academic / GRE Verbs ===
analyze|🔍|analyse|🔍|examine|🔬|investigate|🕵️|explore|🧭|discover|🔭|research|📚|study|📚|prove|🧪|demonstrate|🎯|indicate|👉|suggest|💭|imply|🤔|conclude|📌|argue|💬|claim|📢|state|💬|assert|💪|assume|🤔|estimate|📊|evaluate|✅|assess|📋|compare|⚖️|contrast|⚖️|distinguish|🔀|identify|🆔|interpret|🗣️|predict|🔮|propose|💡|recommend|👍|require|📋|reveal|💡
apply|🖌️|adapt|🔄|adjust|🔧|adopt|🤝|affect|💓|agree|🤝|disagree|❌|allow|✅|deny|🚫|avoid|🙅|attempt|💪|enable|✅|prevent|🚫|reduce|📉|increase|📈|maintain|🔧|preserve|🏺|support|🤝|oppose|🚫|resist|💪|survive|🌱|thrive|🌻
// === Motion / Physical ===
collapse|💥|explode|💥|crash|💥|slip|🤸|fall|🤸|drop|⬇️|rise|⬆️|float|🎈|sink|⬇️|spin|🌀|rotate|🔄|turn|🔄|bend|🤸|stretch|🧘|twist|🌪️|shake|🤝|push|➡️|pull|⬅️|press|👇|release|🫳
// === Senses ===
see|👀|hear|👂|taste|👅|smell|👃|touch|✋|feel|✋|sense|🔮|perceive|👁️|recognize|👁️
// === Communication ===
speak|🗣️|talk|💬|whisper|🤫|shout|📢|scream|😱|murmur|🤫|discuss|💬|debate|⚖️|argue|🤬|explain|💬|describe|💬|express|💬|translate|🌐|pronounce|🗣️|spell|🔤
// === Time & Sequence ===
begin|▶️|start|▶️|end|⏹️|finish|✅|complete|✅|continue|➡️|pause|⏸️|resume|▶️|repeat|🔁|delay|⏳|wait|⏳|hurry|⏱️|postpone|⏸️|extend|↔️
// === Quality / Value ===
perfect|💯|excellent|🏆|outstanding|🌟|superior|👑|inferior|📉|average|📊|normal|😐|unusual|🤔|unique|💎|rare|💎|common|🔁|typical|📊|strange|🤔
// === Movement ===
arrive|🏁|depart|✈️|enter|🚪|exit|🚪|return|🔁|travel|✈️|journey|🗺️|wander|🚶|roam|🚶|migrate|🦅|flee|🏃|escape|🏃|pursue|🏃|chase|🏃|approach|🚶
`.trim();

// Convert the pipe-separated lines into a Map<string, string>.
// Format on each line: word1|emoji1|word2|emoji2|...
// Lines may also contain // comments which are stripped.
export const EMOJI_MAP = (() => {
  const map = new Map();
  const lines = WORD_EMOJI.split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;
    // Strip any inline // comments
    const clean = line.split('//')[0].trim();
    if (!clean) continue;
    const parts = clean.split('|').map(s => s.trim()).filter(Boolean);
    // Walk in pairs: word, emoji, word, emoji, ...
    for (let i = 0; i + 1 < parts.length; i += 2) {
      const word = parts[i].toLowerCase();
      const emoji = parts[i + 1];
      if (word && emoji && !map.has(word)) {
        map.set(word, emoji);
      }
    }
  }
  return map;
})();

export function getInstantEmoji(word) {
  if (!word) return null;
  return EMOJI_MAP.get(String(word).toLowerCase().trim()) || null;
}

// 5 mood gradients used as quick fallback background.
// MUST be declared before getWordStyle() — `const` is in TDZ until executed,
// and getWordStyle() reads MOOD_GRADIENTS at call time, not declaration time.
export const MOOD_GRADIENTS = {
  happy:  'linear-gradient(135deg, #FEF3C7 0%, #FBBF24 100%)',
  calm:   'linear-gradient(135deg, #DBEAFE 0%, #93C5FD 100%)',
  active: 'linear-gradient(135deg, #FED7AA 0%, #F97316 100%)',
  warm:   'linear-gradient(135deg, #FECACA 0%, #F43F5E 100%)',
  bright: 'linear-gradient(135deg, #D1FAE5 0%, #10B981 100%)',
};

// Fallback stand-ins: when a word is not in EMOJI_MAP, point it at a
// semantic neighbor that's already in the map. This avoids the "two books"
// problem where unknown words default to '📚'. Every entry must resolve to
// a key that exists in EMOJI_MAP.
const FALLBACK_STAND_IN = {
  // Academic verbs that should map to "research" not "book"
  inquire: 'research', query: 'research', examine: 'research',
  scrutinize: 'research', inspect: 'research', audit: 'research',
  // Abstract action words -> nearest concrete archetype
  accelerate: 'rocket',       // 加速 -> rocket 已经在字典
  // 词书常考但字典没有
  'soar':     'rocket',
  'soaring':  'rocket',
  'plunge':   'water',
  'surge':    'rocket',
  'slump':    '📉',
  'boom':     '💥',
  'bust':     '💥',
  'boost':    '📈',
  'thrive':   '🌱',
  'flourish': '🌻',
  'wither':   '🍂',
  'fade':     '🌫️',
  'glow':     '✨',
  'gleam':    '✨',
  'sparkle':  '✨',
  'shimmer':  '✨',
  'gleam_':   '✨',
  'glitter':  '✨',
  'blossom':  '🌸',
  'bloom':    '🌸',
  'wilt':     '🥀',
  'lush':     '🌿',
  'barren':   '🏜️',
  'vast':     '🌌',
  'tiny':     '🤏',
  'enormous': '🐘',
  'gigantic': '🐘',
  'petite':   '🤏',
  'swift':    '⚡',
  'agile':    '🤸',
  'clumsy':   '🤦',
  'bold':     '🦁',
  'timid':    '🐭',
  'fierce':   '🐯',
  'gentle':   '🕊️',
  'stern':    '😐',
  'jovial':   '🤣',
  'glum':     '😞',
  'elated':   '🤩',
  'ecstatic': '🤩',
  'downcast': '😞',
  'somber':   '🌧️',
  'vibrant':  '🎨',
  'dull':     '😐',
  'loud':     '📢',
  'faint':    '🤏',
  'distant':  '🌌',
  'intimate': '🤝',
  'public':   '🌐',
  'private':  '🔒',
  'sacred':   '🛕',
  'profane':  '🙅',
  'genuine':  '💎',
  'fraud':    '🎭',
  'honest':   '🤝',
  'candid':   '🗣️',
  'rude':     '🤬',
  'polite':   '🙏',
  'humble':   '🙏',
  'arrogant': '🦚',
  'cowardly': '🐭',
  'heroic':   '🦸',
  'loyal':    '🐕',
  'traitor':  '🗡️',
  'stubborn': '🪨',
  'flexible': '🤸',
  'rigid':    '🪨',
};

// Look up the best archetype-style entry for a word.
// Falls back through (in order):
//   1) exact match in EMOJI_MAP
//   2) fallback stand-in (semantic neighbor that's already curated)
//   3) null  -> caller delegates to WordSceneArt
export function getWordStyle(word) {
  if (!word) return null;
  const key = String(word).toLowerCase().trim();
  let e = EMOJI_MAP.get(key);
  if (!e) {
    // Strip the '_' key placeholder used above (since '|' is data, '_' is a
    // safer way to point at a literal emoji not in the map).
    const standInKey = FALLBACK_STAND_IN[key];
    if (standInKey) {
      if (EMOJI_MAP.has(standInKey)) {
        e = EMOJI_MAP.get(standInKey);
      } else if (standInKey.length <= 4) {
        // Treat as literal emoji
        e = standInKey;
      }
    }
  }
  if (!e) return null;
  return { emoji: e, gradient: MOOD_GRADIENTS.happy };
}
