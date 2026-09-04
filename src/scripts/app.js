    (() => {
      'use strict';

      const STORAGE = {
        settings: 'mingxi.settings.v1',
        conversations: 'mingxi.conversations.v1',
        handbook: 'mingxi.handbook.v1',
        helpSeen: 'mingxi.help-seen.v1'
      };

      const HANDBOOK_LIMITS = {
        minChars: 100,
        maxBytes: 1024 * 1024,
        targetChunkChars: 1200,
        maxChunkChars: 1800,
        overlapChars: 80,
        maxResults: 4,
        maxContextChars: 4000,
        minScore: 4
      };

      const SEARCH_STOP_WORDS = new Set([
        '通知', '修改', '编写', '要求', '材料', '时间', '地点', '完成', '工作', '需要',
        '进行', '相关', '内容', '提供', '说明', '请问', '请', '这个', '那个', '怎么', '如何',
        '模式', '用户', '已有', '原通知', '新通知', '我们', '你们', '他们', '以及', '或者',
        '信息', '是否', '对象', '参与', '全体', '负责', '检查', '完整', '一段', '完全',
        '已经', '可以', '应当', '使用', '通过'
      ]);

      const COMMON_SYSTEM_PROMPT = `通知的最终目标是：让需要行动的人，在最短阅读时间内，准确完成本次工作。

一、基本原则

事实正确优先于表达完整。

只使用材料中已经明确或能够唯一确定的信息。不得根据往年惯例、一般经验或上下文猜测时间、地点、对象、名额、资格、材料、提交方式、评选标准等影响执行的信息，也不得为了让通知显得完整而自行补充。

区分本次任务要求与材料中引用的旧通知、模板、示例、他人转述或讨论方案。除非使用者明确要求，否则不要把参考内容当作本次有效事实。

材料冲突时，原则上按以下优先级判断：
1. 本次工作的最新明确要求；
2. 学校、学院当期正式文件；
3. 老师或团委副书记针对本次工作的明确说明；
4. 本次会议记录、聊天记录等；
5. 《团委组织部工作手册》；
6. 往期材料；
7. 一般经验。

无法判断哪项有效时，必须询问使用者。

《团委组织部工作手册》和往期通知中的日期、年级、地点、链接、文件名、名额及具体流程，除非明确说明仍然有效，否则只作为参考。

二、生成前核验

在内部检查通知所需的六类信息：
- 事项：要做什么；
- 对象：谁需要执行；
- 时间：何时参加或截止；
- 地点或渠道：在哪里或通过什么方式完成；
- 要求：材料、格式、数量、资格、步骤等；
- 完成判据：怎样算完成、如何确认。

并检查：
- 不同材料是否冲突；
- 是否遗漏原始材料的重要要求；
- 是否混入无依据的信息；
- 是否存在“尽快、近期、相关材料、按要求”等会影响执行的模糊表达；
- 日期与星期、年级、班级、数字、文件名、链接等是否一致；
- 附件、图片、二维码或链接的用途是否说明清楚。

某项信息不适用于本次通知时可以省略，不机械补齐栏目。如果缺失或冲突的信息会影响正确执行，先询问。

三、写作规则

通知应准确、明确、简洁、可执行。接收者原则上只看当前通知，就应知道自己是否需要行动、具体做什么、何时完成、在哪里完成，以及有哪些关键要求。

标题一般使用“【任务名称】具体事项”。“【】”内的任务名称原则上与《团委组织部工作手册》保持一致。

正文结构按复杂程度决定，不机械套模板。复杂事项可按需使用“参与对象、时间或截止时间、地点或提交方式、要求、注意事项”等栏目；简单事项直接用一至数句话说明即可。

使用短句和明确动词，如“填写、上传、提交、加入、录入、参加、确认”。能够具体说明时，不使用模糊词、套话或无意义强调。

时间优先写为“9月25日（周五）18:00”“9月25日（周五）18:00前”或“9月25日（周五）18:00—19:30”。发布文本中不使用“明天、下周一、三天内、通知时间加若干天”等相对表达；能唯一换算时改为具体日期，不能确定时询问使用者。

链接独立成行并说明用途；多个材料或电子版、纸质版要求分别列出；附件、图片、二维码说明其作用。

完成判据不等于必须回复。能够通过腾讯文档、接龙、智慧团建、签到等直接核验时，不额外要求回复；只有组织部无法通过其他方式判断是否完成，或者需要责任人作最终确认时，才要求群内回复。需要回复时给出明确格式，例如：“完成后请回复：电气2301填写完成并核对无误”。

需要团支书等人员转发时，明确写“各位团支书，请转发以下通知至本班：”，且被转发正文必须能够脱离上层消息独立理解和执行。

时间、地点、对象、材料、提交方式等影响执行的信息发生变化时，生成一份完整的当前有效通知，不只写局部更正。标题可使用“【任务名称】具体事项（更新）”，并说明“因安排调整，××有所变更，以本通知为准”。

催办通知只针对尚未完成者，保留事项、未完成人员和最终截止时间，不重复整份原通知，也不得新增要求。`;

      const SYSTEM_PROMPTS = Object.freeze({
        write: `你是天津工业大学电气工程学院团委组织部的通知编写助手。使用者可能提供聊天记录、零散要求、学校或学院文件、《团委组织部工作手册》、往期通知等材料。你的任务是核对事实、发现问题，并根据材料生成准确、清楚、简洁、可直接发送的通知。

${COMMON_SYSTEM_PROMPT}

四、本模式的任务

当前模式是“编写新通知”。使用者提供的是本次通知的事实材料，而不一定是整理好的草稿。自行从文件、聊天记录和零散要求中提取有效信息，不要求使用者先重新整理。先在内部完成事实归并和核验，再决定输出。

如果后续对话补充或改变了事实，以最新明确要求为准，并重新生成一份完整的当前有效通知。

五、输出规则

如果缺失或冲突的信息会影响通知正确执行，回复“目前还不能生成最终通知，需要确认以下信息：”，随后只列真正影响发布的问题，一问一项；不要输出猜测版本、半成品通知或冗长分析。

如果信息足够，直接输出一份可以复制发送的最终通知，不附加“以下是通知”“修改说明”“核验过程”等前后文。

最终通知使用纯文本友好格式，不使用 Markdown 加粗符号包裹标题或正文。`,

        revise: `你是天津工业大学电气工程学院团委组织部的通知修改助手。使用者会提供原通知、修改要求，并可能补充聊天记录、学校或学院文件、《团委组织部工作手册》、往期通知等材料。你的任务不是只做语言润色，而是核对事实、落实修改、发现问题，并生成准确、清楚、简洁、可直接发送的完整新版本。

原通知是待修改对象，不天然代表正确或最新事实。明确的新要求优先于原通知中的旧信息。未被修改要求影响且没有冲突的有效内容应保留，不得因改写而擅自删除或改变含义。

${COMMON_SYSTEM_PROMPT}

四、本模式的任务

当前模式是“修改已有通知”。同时处理原通知和使用者的修改要求。先在内部逐项核对修改要求并完成关联更新；修改一处后，同步检查标题、正文、附件说明、回复格式等受影响位置。

若使用者只要求调整语气、格式或详略，不改变原通知中的事实；若使用者提供了新事实，用新事实替换所有受影响的旧表述。无论修改大小，最终都生成一份独立、完整、当前有效的新通知，不要只返回改动片段、替换句、差异列表或“其余不变”。

如果后续对话继续提出修改，以整段对话中最新明确要求为准，再次输出完整版本。

五、输出规则

如果修改要求本身不清楚，或缺失、冲突的信息会影响通知正确执行，回复“目前还不能生成最终通知，需要确认以下信息：”，随后只列真正影响发布的问题，一问一项；不要擅自选择冲突信息，也不要输出猜测版本或半成品通知。

如果信息足够，直接输出修改完成、可以复制发送的完整通知，不附加“修改如下”“修改说明”“核验过程”等前后文。

最终通知使用纯文本友好格式，不使用 Markdown 加粗符号包裹标题或正文。`,

        check: `你是天津工业大学电气工程学院团委组织部的通知检查助手。使用者会提供一份待检查通知，并可能补充其事实来源、学校或学院文件、《团委组织部工作手册》、往期通知等材料。你的任务是检查事实完整性、前后冲突、歧义和可执行性，并在条件允许时给出准确、清楚、简洁、可直接发送的修订版。

待检查通知中的陈述可以用于检查其内部完整性与一致性，但不能仅凭表述自然就断定其与外部事实相符。有其他事实材料时逐项对照；没有事实来源时，不虚构依据，也不反复给出笼统的“无法核实真实性”提示。

${COMMON_SYSTEM_PROMPT}

四、本模式的任务

当前模式是“检查通知”。除通用核验项目外，重点检查标题与正文是否对应，指代、范围、步骤、责任人和先后顺序是否明确，以及接收者能否仅凭当前通知判断自己是否需要行动并完成任务。不要把个人风格偏好当成错误，只报告会影响准确性、理解、执行或明显损害简洁性的实质问题。

对能够在不新增事实的情况下修复的问题，直接修复并给出完整修订版。对无法从现有材料确定、且会影响正确执行的信息，不得用占位符或猜测值代替，也不得假装已经完成检查。

如果后续对话补充了事实或要求，重新检查，并提供反映最新信息的完整结果。

五、输出规则

如果存在会影响正确执行的关键缺失或冲突，回复“目前还不能生成最终通知，需要确认以下信息：”，随后只列必须确认的问题，一问一项；不要输出可能被误发的猜测版通知。

如果不存在阻碍发布的问题，先以“检查结果：”开头，用简短条目指出实质问题及对应修改；如果没有实质问题，写“未发现影响发布的问题”。然后以“修订版：”开头，输出一份可以复制发送的完整通知。即使原文无需修改，也完整呈现通知，便于直接复制。

检查结果保持简洁，不展开写作过程。修订版使用纯文本友好格式，不使用 Markdown 加粗符号包裹标题或正文。`
      });

      const LEGACY_MODE_PROMPT_SUFFIXES = Object.freeze({
        write: '当前模式是“编写新通知”。信息足够时只输出一份可直接发送的最终通知；关键事实缺失或冲突时只列必须确认的问题。',
        revise: '当前模式是“修改已有通知”。逐项落实修改要求，并输出一份独立、完整、当前有效的新通知，不只返回改动片段或差异说明。',
        check: '当前模式是“检查通知”。关键事实有问题时只列必须确认的问题；能够安全修订时，先简洁列出检查结果，再输出一份可直接发送的完整修订版。'
      });

      const state = {
        mode: 'write',
        conversations: [],
        currentId: null,
        isGenerating: false,
        abortController: null,
        hasSavedSettings: false,
        settingsRequired: true,
        helpSeen: false,
        helpRequired: true,
        storageAvailable: true,
        handbook: null,
        handbookChunks: [],
        handbookImportRequired: true,
        settings: {
          baseUrl: 'https://api.openai.com/v1',
          apiKey: '',
          model: 'gpt-4.1-mini',
          systemPrompts: { ...SYSTEM_PROMPTS }
        }
      };

      const el = {};
      const ids = [
        'sidebar', 'scrim', 'settingsButton', 'sidebarSettingsButton', 'topSettingsButton', 'helpButton',
        'newChatButton', 'clearHistoryButton', 'historyList', 'mobileMenuButton',
        'conversationTitle', 'modeChip', 'copyConversationButton', 'workspace',
        'welcomeView', 'chatView', 'messages', 'writeTab', 'reviseTab', 'checkTab', 'writeFields',
        'reviseFields', 'checkFields', 'writeInput', 'writeCount', 'originalInput', 'requirementInput', 'checkInput',
        'composerTip', 'generateButton', 'chatComposerWrap', 'followupInput', 'sendButton',
        'sendIcon', 'settingsOverlay', 'settingsTitle', 'closeSettingsButton', 'settingsForm',
        'cancelSettingsButton', 'settingsDescription', 'baseUrlInput', 'apiKeyInput', 'modelInput',
        'providerPresets', 'writeSystemPromptInput', 'writeSystemPromptCount', 'resetWriteSystemPromptButton',
        'reviseSystemPromptInput', 'reviseSystemPromptCount', 'resetReviseSystemPromptButton',
        'checkSystemPromptInput', 'checkSystemPromptCount', 'resetCheckSystemPromptButton',
        'revealKeyButton', 'handbookSettingsName', 'handbookSettingsMeta',
        'replaceHandbookButton', 'handbookOverlay', 'handbookTitle',
        'handbookDescription', 'closeHandbookButton', 'handbookDropZone',
        'handbookFileInput', 'dropZoneTitle', 'handbookImportError', 'helpOverlay',
        'helpTitle', 'closeHelpButton', 'finishHelpButton', 'toastStack'
      ];

      ids.forEach(id => { el[id] = document.getElementById(id); });

      function safeParse(value, fallback) {
        try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
      }

      function loadState() {
        let rawSettings = null;
        let rawConversations = null;
        let rawHandbook = null;
        let rawHelpSeen = null;
        try {
          rawSettings = localStorage.getItem(STORAGE.settings);
          rawConversations = localStorage.getItem(STORAGE.conversations);
          rawHandbook = localStorage.getItem(STORAGE.handbook);
          rawHelpSeen = localStorage.getItem(STORAGE.helpSeen);
        } catch {
          state.storageAvailable = false;
          toast('浏览器未开放本地存储，设置、手册与历史将在关闭页面后丢失。', true);
        }
        state.hasSavedSettings = Boolean(rawSettings);
        state.settingsRequired = !state.hasSavedSettings;
        state.helpSeen = rawHelpSeen === 'true';
        state.helpRequired = !state.helpSeen;
        const savedSettings = safeParse(rawSettings, {});
        const savedSystemPrompts = savedSettings.systemPrompts && typeof savedSettings.systemPrompts === 'object'
          ? savedSettings.systemPrompts
          : {};
        const migratedSystemPrompts = {};
        ['write', 'revise', 'check'].forEach(mode => {
          if (typeof savedSystemPrompts[mode] === 'string') {
            migratedSystemPrompts[mode] = savedSystemPrompts[mode];
          } else if (typeof savedSettings.systemPrompt === 'string') {
            const legacyPrompt = savedSettings.systemPrompt.trim();
            migratedSystemPrompts[mode] = legacyPrompt
              ? `${legacyPrompt}\n\n${LEGACY_MODE_PROMPT_SUFFIXES[mode]}`
              : legacyPrompt;
          }
        });
        state.settings = {
          ...state.settings,
          ...savedSettings,
          systemPrompts: { ...SYSTEM_PROMPTS, ...migratedSystemPrompts }
        };
        delete state.settings.systemPrompt;
        const savedConversations = safeParse(rawConversations, []);
        state.conversations = Array.isArray(savedConversations)
          ? savedConversations.filter(item => item && item.id && Array.isArray(item.messages))
          : [];
        state.conversations.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        const savedHandbook = safeParse(rawHandbook, null);
        if (savedHandbook && typeof savedHandbook.rawText === 'string' && countChars(savedHandbook.rawText) >= HANDBOOK_LIMITS.minChars) {
          state.handbook = savedHandbook;
          state.handbookChunks = parseHandbook(savedHandbook.rawText);
          state.handbookImportRequired = !state.handbookChunks.length;
        }
      }

      function saveSettings() {
        try { localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings)); }
        catch { toast('设置保存失败：浏览器可能禁用了本地存储。', true); }
      }

      function saveConversations() {
        try { localStorage.setItem(STORAGE.conversations, JSON.stringify(state.conversations)); }
        catch { toast('历史保存失败：本地存储空间可能已满。', true); }
      }

      function saveHandbook() {
        if (!state.handbook) return false;
        try {
          localStorage.setItem(STORAGE.handbook, JSON.stringify(state.handbook));
          return true;
        } catch {
          state.storageAvailable = false;
          toast('手册已在本次会话中启用，但无法保存；刷新后需要重新导入。', true);
          return false;
        }
      }

      function saveHelpSeen() {
        try { localStorage.setItem(STORAGE.helpSeen, 'true'); }
        catch {
          state.storageAvailable = false;
          toast('帮助状态无法保存，下次打开时仍会显示本页。', true);
        }
      }

      function currentConversation() {
        return state.conversations.find(item => item.id === state.currentId) || null;
      }

      function uid() {
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      }

      function countChars(value) {
        return Array.from(value.trim()).length;
      }

      function normalizeHandbookText(value) {
        return String(value || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
      }

      function cleanHeadingTitle(value) {
        return String(value || '')
          .replace(/\s+#+\s*$/, '')
          .replace(/[*_`]/g, '')
          .trim();
      }

      function cleanReferenceLabel(value) {
        return cleanHeadingTitle(value)
          .replace(/【重要】/g, '')
          .replace(/^[（(][一二三四五六七八九十百\d]+[）)]\s*/, '')
          .replace(/^[一二三四五六七八九十百\d]+[、.．]\s*/, '')
          .trim();
      }

      function splitLongText(text, maxChars = HANDBOOK_LIMITS.maxChunkChars, overlap = HANDBOOK_LIMITS.overlapChars) {
        const source = text.trim();
        if (countChars(source) <= maxChars) return [source];
        const parts = [];
        let start = 0;
        while (start < source.length) {
          let end = Math.min(source.length, start + maxChars);
          if (end < source.length) {
            const paragraphBreak = source.lastIndexOf('\n\n', end);
            const lineBreak = source.lastIndexOf('\n', end);
            const preferredBreak = Math.max(paragraphBreak, lineBreak);
            if (preferredBreak > start + Math.floor(maxChars * .62)) end = preferredBreak;
          }
          const part = source.slice(start, end).trim();
          if (part) parts.push(part);
          if (end >= source.length) break;
          const nextStart = Math.max(start + 1, end - overlap);
          start = nextStart;
        }
        return parts;
      }

      function markdownSections(text) {
        const lines = text.split('\n');
        const sections = [];
        const stack = [];
        let active = null;
        let preamble = [];

        const visiblePath = () => {
          const entries = stack.length > 1 && stack[0].level === 1 ? stack.slice(1) : stack;
          return entries.map(item => item.title);
        };

        const flush = () => {
          if (!active) return;
          const body = active.lines.join('\n').trim();
          if (body) sections.push({ path: active.path, title: active.title, text: body });
        };

        lines.forEach(line => {
          const heading = line.match(/^(#{1,6})[ \t]+(.+?)\s*$/);
          if (!heading) {
            if (active) active.lines.push(line);
            else preamble.push(line);
            return;
          }

          flush();
          const level = heading[1].length;
          const title = cleanHeadingTitle(heading[2]);
          while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
          stack.push({ level, title });
          active = { path: visiblePath(), title, lines: [] };
        });
        flush();

        const preambleText = preamble.join('\n').trim();
        if (preambleText) sections.unshift({ path: ['手册说明'], title: '手册说明', text: preambleText });
        return sections;
      }

      function plainTextSections(text) {
        const paragraphs = text.split(/\n{2,}/).map(item => item.trim()).filter(Boolean);
        const packed = [];
        let buffer = '';

        const flush = () => {
          if (!buffer) return;
          packed.push(buffer.trim());
          buffer = '';
        };

        paragraphs.forEach(paragraph => {
          if (countChars(paragraph) > HANDBOOK_LIMITS.maxChunkChars) {
            flush();
            splitLongText(paragraph).forEach(part => packed.push(part));
            return;
          }
          const combined = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
          if (buffer && countChars(combined) > HANDBOOK_LIMITS.targetChunkChars) flush();
          buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
        });
        flush();

        return packed.map((content, index) => ({
          path: [`手册片段 ${index + 1}`],
          title: `手册片段 ${index + 1}`,
          text: content
        }));
      }

      function normalizeSearchText(value) {
        return String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
      }

      function searchTerms(value) {
        const source = String(value || '').normalize('NFKC').toLowerCase();
        const terms = new Set();
        const addTerm = raw => {
          const term = raw.replace(/[^\p{Script=Han}a-z0-9_-]/gu, '').trim();
          if (term.length >= 2 && !SEARCH_STOP_WORDS.has(term)) terms.add(term);
        };

        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
          const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
          for (const item of segmenter.segment(source)) {
            if (item.isWordLike) addTerm(item.segment);
          }
        }
        for (const match of source.matchAll(/[\p{Script=Han}]+/gu)) {
          const run = match[0];
          if (run.length === 2) addTerm(run);
          else for (let index = 0; index < run.length - 1; index += 1) addTerm(run.slice(index, index + 2));
        }
        for (const match of source.matchAll(/[a-z0-9][a-z0-9_-]+/g)) addTerm(match[0]);
        return terms;
      }

      function parseHandbook(rawText) {
        const text = normalizeHandbookText(rawText);
        if (!text) return [];
        const hasMarkdownHeadings = /^#{1,6}[ \t]+.+$/m.test(text);
        const sections = hasMarkdownHeadings ? markdownSections(text) : plainTextSections(text);
        const chunks = [];

        sections.forEach(section => {
          const parts = splitLongText(section.text);
          parts.forEach((part, partIndex) => {
            const path = section.path.length ? section.path.join(' > ') : section.title;
            const title = section.title || section.path[section.path.length - 1] || '手册片段';
            chunks.push({
              id: `hb-${chunks.length + 1}`,
              path,
              title,
              part: parts.length > 1 ? partIndex + 1 : null,
              text: part,
              normalizedPath: normalizeSearchText(path),
              normalizedText: normalizeSearchText(part),
              pathTerms: searchTerms(path),
              bodyTerms: searchTerms(part)
            });
          });
        });
        return chunks;
      }

      function countOccurrences(source, term) {
        if (!term || !source.includes(term)) return 0;
        let count = 0;
        let position = 0;
        while ((position = source.indexOf(term, position)) !== -1) {
          count += 1;
          position += term.length;
          if (count >= 3) break;
        }
        return count;
      }

      function handbookQuery(conversation, assistantIndex) {
        const userMessages = conversation.messages
          .slice(0, assistantIndex)
          .filter(message => message.role === 'user' && message.content);
        if (!userMessages.length) return '';
        const selected = [userMessages[0], ...userMessages.slice(-2)];
        const seen = new Set();
        return selected
          .filter(message => {
            if (seen.has(message)) return false;
            seen.add(message);
            return true;
          })
          .map(message => message.content)
          .join('\n\n');
      }

      function retrieveHandbook(query) {
        const chunks = state.handbookChunks;
        const terms = searchTerms(query);
        if (!chunks.length || !terms.size) return { selected: [], topScore: 0, contextChars: 0 };
        const normalizedQuery = normalizeSearchText(query);
        const documentCount = chunks.length;
        const documentFrequency = new Map();

        terms.forEach(term => {
          const count = chunks.reduce((total, chunk) => (
            chunk.pathTerms.has(term) || chunk.bodyTerms.has(term) ||
            chunk.normalizedPath.includes(term) || chunk.normalizedText.includes(term)
              ? total + 1 : total
          ), 0);
          documentFrequency.set(term, count);
        });

        const scored = chunks.map(chunk => {
          let score = 0;
          terms.forEach(term => {
            const frequency = documentFrequency.get(term) || 0;
            const idf = Math.log((documentCount + 1) / (frequency + 1)) + 1;
            if (chunk.normalizedPath.includes(term)) score += 5 * idf;
            const bodyCount = countOccurrences(chunk.normalizedText, term);
            if (bodyCount) score += bodyCount * idf;
          });
          const exactTitle = normalizeSearchText(cleanReferenceLabel(chunk.title));
          if (exactTitle.length >= 2 && normalizedQuery.includes(exactTitle)) score += 12;
          return { chunk, score };
        }).sort((a, b) => b.score - a.score);

        const topScore = scored[0]?.score || 0;
        if (topScore < HANDBOOK_LIMITS.minScore) return { selected: [], topScore, contextChars: 0 };

        const selected = [];
        let usedChars = 0;
        const selectionThreshold = Math.max(HANDBOOK_LIMITS.minScore, topScore * .45);
        for (const item of scored) {
          if (item.score < selectionThreshold || selected.length >= HANDBOOK_LIMITS.maxResults) break;
          const heading = `[章节：${item.chunk.path}${item.chunk.part ? `（第 ${item.chunk.part} 段）` : ''}]\n`;
          const separatorChars = selected.length ? 2 : 0;
          const remaining = HANDBOOK_LIMITS.maxContextChars - usedChars - separatorChars;
          if (remaining <= heading.length + 20) break;
          const excerpt = item.chunk.text.slice(0, Math.max(0, remaining - heading.length));
          const blockChars = separatorChars + heading.length + excerpt.length;
          if (excerpt.length < 20) continue;
          selected.push({ ...item.chunk, excerpt, score: item.score });
          usedChars += blockChars;
        }
        return { selected, topScore, contextChars: usedChars };
      }

      function handbookPrompt(retrieval) {
        if (!retrieval.selected.length) return '';
        const blocks = retrieval.selected.map(item => (
          `[章节：${item.path}${item.part ? `（第 ${item.part} 段）` : ''}]\n${item.excerpt}`
        )).join('\n\n');
        return `\n\n手册摘录使用规则：以下内容由浏览器从用户导入的工作手册中检索，只作本轮事实参考。用户针对本次工作的最新明确要求优先于手册；不得根据未提供的其他章节推断事实；不要在最终通知中提及检索过程。\n\n<handbook_context>\n${blocks}\n</handbook_context>`;
      }

      function handbookReferences(retrieval) {
        const seen = new Set();
        return retrieval.selected.reduce((references, item) => {
          if (!seen.has(item.path)) {
            seen.add(item.path);
            references.push({ id: item.id, path: item.path });
          }
          return references;
        }, []);
      }

      function shortTitle(text) {
        const cleaned = text
          .replace(/^模式：[^\n]+\n+/, '')
          .replace(/^用户提供的材料：\n?|^原通知：\n?/m, '')
          .replace(/\s+/g, ' ')
          .trim();
        return cleaned.length > 22 ? `${cleaned.slice(0, 22)}…` : (cleaned || '未命名通知');
      }

      function formatTime(timestamp) {
        const date = new Date(timestamp || Date.now());
        const now = new Date();
        const sameDay = date.toDateString() === now.toDateString();
        if (sameDay) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
      }

      function formatInteger(value) {
        return Number(value).toLocaleString('zh-CN');
      }

      function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, char => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        })[char]);
      }

      function toast(message, isError = false) {
        const node = document.createElement('div');
        node.className = `toast${isError ? ' error' : ''}`;
        node.textContent = message;
        el.toastStack.appendChild(node);
        window.setTimeout(() => node.remove(), 3200);
      }

      function openHelp(required = false) {
        state.helpRequired = Boolean(required || !state.helpSeen);
        el.helpTitle.textContent = state.helpRequired ? '欢迎使用明晰' : '如何使用明晰';
        el.closeHelpButton.classList.toggle('hidden', state.helpRequired);
        el.finishHelpButton.textContent = state.helpRequired ? '开始使用' : '知道了';
        el.helpOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        window.setTimeout(() => el.finishHelpButton.focus(), 50);
      }

      function closeHelp(force = false) {
        if (state.helpRequired && !force) return;
        el.helpOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }

      function continueOnboarding() {
        if (!state.helpSeen) {
          openHelp(true);
          return;
        }
        if (!state.handbook || !state.handbookChunks.length) {
          openHandbookImport(true);
          return;
        }
        if (!state.hasSavedSettings) openSettings(true);
      }

      function finishHelp() {
        if (state.helpRequired) {
          state.helpSeen = true;
          state.helpRequired = false;
          saveHelpSeen();
        }
        closeHelp(true);
        continueOnboarding();
      }

      function formatFileSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
      }

      function renderHandbookStatus() {
        if (!state.handbook) {
          el.handbookSettingsName.textContent = '尚未导入';
          el.handbookSettingsMeta.textContent = '导入后才能开始校编';
          el.replaceHandbookButton.textContent = '导入';
          return;
        }
        el.handbookSettingsName.textContent = state.handbook.fileName || '已导入手册';
        el.handbookSettingsMeta.textContent = `${formatFileSize(state.handbook.size || state.handbook.rawText.length)} · ${state.handbook.charCount || countChars(state.handbook.rawText)} 字 · ${state.handbookChunks.length} 个检索片段`;
        el.replaceHandbookButton.textContent = '替换';
      }

      function openHandbookImport(required = !state.handbook) {
        state.handbookImportRequired = Boolean(required || !state.handbook);
        el.handbookTitle.textContent = state.handbookImportRequired ? '先导入工作手册' : '替换工作手册';
        el.handbookDescription.textContent = state.handbookImportRequired
          ? '首次使用需要导入手册。程序只会为每轮请求选取少量相关章节。'
          : '新手册会立即替换当前版本，既有对话记录不会被删除。';
        el.closeHandbookButton.classList.toggle('hidden', state.handbookImportRequired);
        el.handbookImportError.textContent = '';
        el.dropZoneTitle.textContent = '选择或拖入手册文件';
        el.handbookDropZone.classList.remove('busy', 'dragging');
        el.handbookDropZone.setAttribute('aria-busy', 'false');
        el.handbookFileInput.value = '';
        el.handbookOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        window.setTimeout(() => el.handbookDropZone.focus(), 50);
      }

      function closeHandbookImport() {
        if (state.handbookImportRequired) return;
        el.handbookOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }

      async function importHandbookFile(file) {
        el.handbookImportError.textContent = '';
        if (!file) return;
        const extension = (file.name.split('.').pop() || '').toLowerCase();
        if (!['md', 'markdown', 'txt'].includes(extension)) {
          el.handbookImportError.textContent = '文件格式不支持，请选择 .md、.markdown 或 .txt 文件。';
          return;
        }
        if (!file.size || file.size > HANDBOOK_LIMITS.maxBytes) {
          el.handbookImportError.textContent = file.size > HANDBOOK_LIMITS.maxBytes
            ? '文件超过 1 MB，请精简后重新导入。'
            : '文件为空，请选择有效的手册文件。';
          return;
        }

        el.handbookDropZone.classList.add('busy');
        el.handbookDropZone.setAttribute('aria-busy', 'true');
        el.dropZoneTitle.textContent = '正在解析手册…';
        try {
          const rawText = normalizeHandbookText(await file.text());
          const charCount = countChars(rawText);
          if (charCount < HANDBOOK_LIMITS.minChars) {
            throw new Error(`手册内容不足 ${HANDBOOK_LIMITS.minChars} 字，请检查文件是否正确。`);
          }
          const chunks = parseHandbook(rawText);
          if (!chunks.length) throw new Error('没有从文件中识别到可用文本。');

          state.handbook = {
            version: 1,
            fileName: file.name,
            size: file.size,
            lastModified: file.lastModified || null,
            importedAt: Date.now(),
            charCount,
            rawText
          };
          state.handbookChunks = chunks;
          state.handbookImportRequired = false;
          const persisted = saveHandbook();
          renderHandbookStatus();
          closeHandbookImport();
          toast(`手册已导入：${chunks.length} 个检索片段${persisted ? '' : '（仅本次会话）'}`);
          window.setTimeout(continueOnboarding, 0);
        } catch (error) {
          el.handbookImportError.textContent = error?.message || '手册读取失败，请检查文件编码后重试。';
          el.dropZoneTitle.textContent = '选择或拖入手册文件';
        } finally {
          el.handbookDropZone.classList.remove('busy');
          el.handbookDropZone.setAttribute('aria-busy', 'false');
        }
      }

      function chooseHandbookFile() {
        el.handbookFileInput.value = '';
        el.handbookFileInput.click();
      }

      async function copyText(text, successMessage = '已复制') {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
          } else {
            const area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            if (!document.execCommand('copy')) throw new Error('copy failed');
            area.remove();
          }
          toast(successMessage);
        } catch {
          toast('复制失败，请手动选择文字复制。', true);
        }
      }

      function setMode(mode) {
        if (state.isGenerating) return;
        state.mode = mode;
        const config = {
          write: {
            tab: el.writeTab,
            fields: el.writeFields,
            focus: el.writeInput,
            chip: '编写模式',
            tip: '信息越具体，通知越准确。按 Ctrl / ⌘ + Enter 生成'
          },
          revise: {
            tab: el.reviseTab,
            fields: el.reviseFields,
            focus: el.originalInput,
            chip: '修改模式',
            tip: '助手会同时检查原文问题与修改要求是否冲突'
          },
          check: {
            tab: el.checkTab,
            fields: el.checkFields,
            focus: el.checkInput,
            chip: '检查模式',
            tip: '检查事实完整性、歧义、遗漏与可执行性'
          }
        };
        Object.entries(config).forEach(([key, item]) => {
          const active = key === mode;
          item.tab.classList.toggle('active', active);
          item.tab.setAttribute('aria-selected', String(active));
          item.fields.classList.toggle('hidden', !active);
        });
        const selected = config[mode] || config.write;
        el.modeChip.textContent = selected.chip;
        el.composerTip.textContent = selected.tip;
        window.setTimeout(() => selected.focus.focus(), 0);
      }

      function modeLabel(mode, suffix = false) {
        const labels = { write: '编写', revise: '修改', check: '检查' };
        return `${labels[mode] || labels.write}${suffix ? '模式' : ''}`;
      }

      function renderHistory() {
        if (!state.conversations.length) {
          el.historyList.innerHTML = '<div class="empty-history">还没有历史对话。<br>完成一次校编后会自动保存在这里。</div>';
          return;
        }
        el.historyList.innerHTML = state.conversations.map(conversation => `
          <div class="history-item-wrap">
            <button class="history-item${conversation.id === state.currentId ? ' active' : ''}" type="button" data-id="${escapeHtml(conversation.id)}">
              <span class="history-title">${escapeHtml(conversation.title || '未命名通知')}</span>
              <span class="history-meta">${modeLabel(conversation.mode)} · ${formatTime(conversation.updatedAt)}</span>
            </button>
            <button class="history-delete" type="button" data-delete-id="${escapeHtml(conversation.id)}" aria-label="删除这条对话" title="删除">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M8 7l1 13h6l1-13"></path></svg>
            </button>
          </div>
        `).join('');
      }

      function renderMessages() {
        const conversation = currentConversation();
        const messages = conversation ? conversation.messages : [];
        let latestAssistantIndex = -1;
        for (let index = messages.length - 1; index >= 0; index -= 1) {
          if (messages[index].role === 'assistant') {
            latestAssistantIndex = index;
            break;
          }
        }
        el.messages.innerHTML = '';
        messages.forEach((message, index) => {
          const article = document.createElement('article');
          article.className = `message ${message.role}${index === latestAssistantIndex ? ' latest-assistant' : ''}`;
          article.dataset.index = String(index);
          const avatarText = message.role === 'assistant' ? '明' : '我';
          const speaker = message.role === 'assistant' ? '校编助手' : '你';
          const references = message.role === 'assistant' && Array.isArray(message.handbookRefs)
            ? message.handbookRefs.filter(reference => reference && reference.path)
            : [];
          const referenceHtml = references.length ? `
              <div class="reference-row" aria-label="本轮参考手册章节">
                <span class="reference-label">本轮参考</span>
                ${references.map(reference => {
                  const parts = String(reference.path).split(' > ');
                  const label = cleanReferenceLabel(parts[parts.length - 1]) || '手册章节';
                  return `<span class="reference-chip" title="${escapeHtml(reference.path)}">${escapeHtml(label)}</span>`;
                }).join('')}
              </div>` : '';
          const usage = message.usage || null;
          const usageHtml = message.role === 'assistant'
            ? (usage && Number.isFinite(usage.promptTokens) && Number.isFinite(usage.completionTokens)
              ? `<span>发送 ${formatInteger(usage.promptTokens)} tokens</span><span>接收 ${formatInteger(usage.completionTokens)} tokens</span>`
              : `<span>${state.isGenerating && index === messages.length - 1 ? 'Token 统计中' : 'Token 用量未提供'}</span>`)
            : '';
          const modelHtml = message.role === 'assistant' && message.model
            ? `<span>模型 ${escapeHtml(message.model)}</span>`
            : '';
          article.innerHTML = `
            <div class="avatar" aria-hidden="true">${avatarText}</div>
            <div class="message-body">
              <div class="message-head">
                <div><span class="speaker">${speaker}</span><span class="message-time">${formatTime(message.timestamp)}</span></div>
                <button class="copy-button" type="button" data-copy-index="${index}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>
                  复制
                </button>
              </div>
              ${referenceHtml}
              <div class="message-content${state.isGenerating && index === messages.length - 1 && message.role === 'assistant' ? ' typing' : ''}"></div>
              <div class="message-meta" aria-label="消息统计">
                <span>${formatInteger(countChars(message.content || ''))} 字</span>
                ${usageHtml}
                ${modelHtml}
              </div>
            </div>`;
          article.querySelector('.message-content').textContent = message.content;
          el.messages.appendChild(article);
        });
      }

      function renderView() {
        const conversation = currentConversation();
        const inChat = Boolean(conversation);
        el.welcomeView.classList.toggle('hidden', inChat);
        el.chatView.classList.toggle('hidden', !inChat);
        el.chatComposerWrap.classList.toggle('hidden', !inChat);
        el.copyConversationButton.disabled = !inChat || !conversation.messages.length;
        el.conversationTitle.textContent = inChat ? conversation.title : '新建通知';
        if (inChat) {
          state.mode = conversation.mode || 'write';
          el.modeChip.textContent = modeLabel(state.mode, true);
          renderMessages();
        } else {
          el.modeChip.textContent = modeLabel(state.mode, true);
        }
        renderHistory();
      }

      function updateWriteCount() {
        const count = countChars(el.writeInput.value);
        el.writeCount.textContent = `${count} / 至少 50 字`;
        el.writeCount.classList.toggle('valid', count >= 50);
        if (count >= 50) el.writeInput.classList.remove('invalid');
      }

      function makeInitialMessage() {
        if (state.mode === 'write') {
          const value = el.writeInput.value.trim();
          if (countChars(value) < 50) {
            el.writeInput.classList.add('invalid');
            el.writeInput.focus();
            toast(`还需要补充 ${Math.max(0, 50 - countChars(value))} 字，才能开始编写。`, true);
            return null;
          }
          return `模式：编写新通知\n\n用户提供的材料：\n${value}`;
        }
        if (state.mode === 'revise') {
          const original = el.originalInput.value.trim();
          const requirement = el.requirementInput.value.trim();
          if (!original || !requirement) {
            if (!original) el.originalInput.classList.add('invalid');
            if (!requirement) el.requirementInput.classList.add('invalid');
            (!original ? el.originalInput : el.requirementInput).focus();
            toast('请同时填写需要修改的通知和修改要求。', true);
            return null;
          }
          return `模式：修改已有通知\n\n原通知：\n${original}\n\n用户的修改要求：\n${requirement}`;
        }
        const notice = el.checkInput.value.trim();
        if (!notice) {
          el.checkInput.classList.add('invalid');
          el.checkInput.focus();
          toast('请粘贴需要检查的通知。', true);
          return null;
        }
        return `模式：检查通知\n\n需要检查的通知：\n${notice}`;
      }

      function createConversation(initialContent) {
        const now = Date.now();
        const conversation = {
          id: uid(),
          title: shortTitle(initialContent),
          mode: state.mode,
          createdAt: now,
          updatedAt: now,
          messages: [{ role: 'user', content: initialContent, timestamp: now }]
        };
        state.conversations.unshift(conversation);
        state.currentId = conversation.id;
        saveConversations();
        renderView();
        closeSidebar();
        return conversation;
      }

      function newConversation() {
        if (state.isGenerating) {
          state.abortController?.abort();
          toast('正在停止生成，请稍后再新建通知。');
          return;
        }
        state.currentId = null;
        state.isGenerating = false;
        el.writeInput.value = '';
        el.originalInput.value = '';
        el.requirementInput.value = '';
        el.checkInput.value = '';
        el.followupInput.value = '';
        [el.writeInput, el.originalInput, el.requirementInput, el.checkInput].forEach(node => node.classList.remove('invalid'));
        updateWriteCount();
        renderView();
        closeSidebar();
        const focusTarget = state.mode === 'write' ? el.writeInput : (state.mode === 'revise' ? el.originalInput : el.checkInput);
        window.setTimeout(() => focusTarget.focus(), 0);
      }

      function openConversation(id) {
        if (state.isGenerating) {
          toast('请先停止当前生成。', true);
          return;
        }
        const conversation = state.conversations.find(item => item.id === id);
        if (!conversation) return;
        state.currentId = id;
        renderView();
        closeSidebar();
        scrollToBottom(false);
      }

      function removeConversation(id) {
        const conversation = state.conversations.find(item => item.id === id);
        if (state.isGenerating && state.currentId === id) {
          toast('请先停止当前生成，再删除这条对话。', true);
          return;
        }
        if (!conversation || !window.confirm(`删除“${conversation.title}”？此操作无法撤销。`)) return;
        state.conversations = state.conversations.filter(item => item.id !== id);
        if (state.currentId === id) state.currentId = null;
        saveConversations();
        renderView();
        toast('已删除对话');
      }

      function clearHistory() {
        if (!state.conversations.length) return;
        if (state.isGenerating) {
          toast('请先停止当前生成，再清空历史。', true);
          return;
        }
        if (!window.confirm('清空全部本地对话历史？此操作无法撤销。')) return;
        state.conversations = [];
        state.currentId = null;
        state.isGenerating = false;
        saveConversations();
        renderView();
        toast('已清空全部历史');
      }

      function updateSystemPromptCounts() {
        el.writeSystemPromptCount.textContent = `${countChars(el.writeSystemPromptInput.value)} 字`;
        el.reviseSystemPromptCount.textContent = `${countChars(el.reviseSystemPromptInput.value)} 字`;
        el.checkSystemPromptCount.textContent = `${countChars(el.checkSystemPromptInput.value)} 字`;
      }

      function openSettings(required = false) {
        state.settingsRequired = Boolean(required || !state.hasSavedSettings);
        el.baseUrlInput.value = state.settings.baseUrl || '';
        el.apiKeyInput.value = state.settings.apiKey || '';
        el.modelInput.value = state.settings.model || '';
        el.writeSystemPromptInput.value = state.settings.systemPrompts?.write ?? SYSTEM_PROMPTS.write;
        el.reviseSystemPromptInput.value = state.settings.systemPrompts?.revise ?? SYSTEM_PROMPTS.revise;
        el.checkSystemPromptInput.value = state.settings.systemPrompts?.check ?? SYSTEM_PROMPTS.check;
        el.apiKeyInput.type = 'password';
        el.settingsTitle.textContent = state.settingsRequired ? '配置模型与接口' : '模型与接口';
        el.settingsDescription.textContent = state.settingsRequired
          ? '首次使用需要保存接口地址和模型名称，配置仅保存在当前浏览器。'
          : '支持 OpenAI Chat Completions 兼容接口，配置只保存在当前浏览器。';
        el.closeSettingsButton.classList.toggle('hidden', state.settingsRequired);
        el.cancelSettingsButton.classList.toggle('hidden', state.settingsRequired);
        updateSystemPromptCounts();
        renderHandbookStatus();
        el.settingsOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        window.setTimeout(() => el.baseUrlInput.focus(), 50);
      }

      function closeSettings(force = false) {
        if (state.settingsRequired && !force) return;
        el.settingsOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }

      function saveSettingsFromForm(event) {
        event.preventDefault();
        const baseUrl = el.baseUrlInput.value.trim().replace(/\/+$/, '');
        const model = el.modelInput.value.trim();
        if (!baseUrl || !model) return;
        try { new URL(baseUrl); }
        catch {
          el.baseUrlInput.focus();
          toast('请输入完整有效的 Base URL。', true);
          return;
        }
        state.settings = {
          baseUrl,
          apiKey: el.apiKeyInput.value.trim(),
          model,
          systemPrompts: {
            write: el.writeSystemPromptInput.value.trim(),
            revise: el.reviseSystemPromptInput.value.trim(),
            check: el.checkSystemPromptInput.value.trim()
          }
        };
        state.hasSavedSettings = true;
        state.settingsRequired = false;
        saveSettings();
        closeSettings(true);
        toast('接口设置已保存');
      }

      function endpointFromBase(baseUrl) {
        const clean = baseUrl.trim().replace(/\/+$/, '');
        return /\/chat\/completions$/i.test(clean) ? clean : `${clean}/chat/completions`;
      }

      function displayApiError(status, body) {
        let detail = body;
        try {
          const parsed = JSON.parse(body);
          detail = parsed?.error?.message || parsed?.message || body;
        } catch { /* keep response text */ }
        const compact = String(detail || '').replace(/\s+/g, ' ').slice(0, 260);
        if (status === 401) return `鉴权失败（401），请检查 API Key。${compact ? ` ${compact}` : ''}`;
        if (status === 404) return `接口不存在（404），请检查 Base URL 是否正确。${compact ? ` ${compact}` : ''}`;
        if (status === 429) return `请求过于频繁或额度不足（429）。${compact ? ` ${compact}` : ''}`;
        return `接口请求失败（${status}）。${compact ? ` ${compact}` : ''}`;
      }

      function extractContent(value) {
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
          return value.map(part => typeof part === 'string' ? part : (part?.text || '')).join('');
        }
        return '';
      }

      function normalizeUsage(usage) {
        if (!usage || typeof usage !== 'object') return null;
        const promptTokens = Number(usage.prompt_tokens ?? usage.input_tokens);
        const completionTokens = Number(usage.completion_tokens ?? usage.output_tokens);
        const totalTokens = Number(usage.total_tokens ?? (promptTokens + completionTokens));
        if (!Number.isFinite(promptTokens) || !Number.isFinite(completionTokens)) return null;
        return {
          promptTokens,
          completionTokens,
          totalTokens: Number.isFinite(totalTokens) ? totalTokens : promptTokens + completionTokens
        };
      }

      function setGenerating(active) {
        state.isGenerating = active;
        el.generateButton.disabled = active;
        el.followupInput.disabled = active;
        el.sendButton.classList.toggle('stop', active);
        el.sendButton.setAttribute('aria-label', active ? '停止生成' : '发送');
        el.sendIcon.innerHTML = active
          ? '<rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" stroke="none"></rect>'
          : '<path d="m5 12 14-7-4 14-3-6-7-1Z"></path>';
      }

      function scrollToBottom(smooth = true) {
        window.requestAnimationFrame(() => {
          el.workspace.scrollTo({ top: el.workspace.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
        });
      }

      function updateStreamingMessage(index, content) {
        const conversation = currentConversation();
        if (!conversation || !conversation.messages[index]) return;
        conversation.messages[index].content = content;
        const node = el.messages.querySelector(`.message[data-index="${index}"] .message-content`);
        if (node) node.textContent = content;
        scrollToBottom(false);
      }

      async function readSse(response, onChunk, onMetadata = () => {}) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const processBlock = block => {
          const data = block.split(/\r?\n/)
            .filter(line => line.startsWith('data:'))
            .map(line => line.slice(5).trimStart())
            .join('\n');
          if (!data || data === '[DONE]') return;
          try {
            const json = JSON.parse(data);
            if (json?.usage || json?.model) {
              onMetadata({ usage: normalizeUsage(json.usage), model: json.model || null });
            }
            const delta = extractContent(json?.choices?.[0]?.delta?.content);
            if (delta) onChunk(delta);
          } catch { /* ignore non-JSON event */ }
        };
        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() || '';
          blocks.forEach(processBlock);
          if (done) {
            if (buffer.trim()) processBlock(buffer);
            break;
          }
        }
      }

      async function requestAssistant() {
        const conversation = currentConversation();
        if (!conversation || state.isGenerating) return;
        if (!state.handbook || !state.handbookChunks.length) {
          openHandbookImport(true);
          toast('请先导入工作手册。', true);
          return;
        }
        if (!state.settings.baseUrl || !state.settings.model) {
          openSettings(true);
          toast('请先完成接口设置。', true);
          return;
        }

        const assistantIndex = conversation.messages.length;
        const retrieval = retrieveHandbook(handbookQuery(conversation, assistantIndex));
        const assistantMessage = {
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          handbookRefs: handbookReferences(retrieval),
          model: state.settings.model,
          usage: null
        };
        conversation.messages.push(assistantMessage);
        conversation.updatedAt = Date.now();
        setGenerating(true);
        renderMessages();
        renderHistory();
        scrollToBottom();

        const controller = new AbortController();
        state.abortController = controller;
        let fullText = '';

        try {
          const headers = { 'Content-Type': 'application/json' };
          if (state.settings.apiKey) headers.Authorization = `Bearer ${state.settings.apiKey}`;
          const promptMode = conversation.mode || state.mode || 'write';
          const modeSystemPrompt = state.settings.systemPrompts?.[promptMode] ?? SYSTEM_PROMPTS[promptMode] ?? SYSTEM_PROMPTS.write;
          const requestMessages = [
            { role: 'system', content: `${modeSystemPrompt}\n\n当前日期：${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}。仅在用户材料能够唯一确定相对日期时用于核对日期与星期。${handbookPrompt(retrieval)}` },
            ...conversation.messages.slice(0, assistantIndex).map(({ role, content }) => ({ role, content }))
          ];
          const response = await fetch(endpointFromBase(state.settings.baseUrl), {
            method: 'POST',
            headers,
            signal: controller.signal,
            body: JSON.stringify({
              model: state.settings.model,
              messages: requestMessages,
              temperature: 0.2,
              stream: true,
              stream_options: { include_usage: true }
            })
          });

          if (!response.ok) {
            const body = await response.text();
            throw new Error(displayApiError(response.status, body));
          }

          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('text/event-stream') && response.body) {
            await readSse(response, chunk => {
              fullText += chunk;
              updateStreamingMessage(assistantIndex, fullText);
            }, metadata => {
              if (metadata.usage) assistantMessage.usage = metadata.usage;
              if (metadata.model) assistantMessage.model = metadata.model;
            });
          } else {
            const json = await response.json();
            fullText = extractContent(json?.choices?.[0]?.message?.content);
            assistantMessage.usage = normalizeUsage(json?.usage);
            assistantMessage.model = json?.model || assistantMessage.model;
            updateStreamingMessage(assistantIndex, fullText);
          }

          if (!fullText.trim()) throw new Error('接口返回了空内容，请检查所选模型或接口兼容性。');
          conversation.messages[assistantIndex].content = fullText.trim();
          conversation.updatedAt = Date.now();
          el.followupInput.placeholder = '补充信息或继续修改……';
          state.conversations.sort((a, b) => b.updatedAt - a.updatedAt);
          saveConversations();
        } catch (error) {
          const aborted = error?.name === 'AbortError';
          if (!fullText.trim()) {
            conversation.messages.splice(assistantIndex, 1);
            el.followupInput.placeholder = '请求未完成。修正设置后，留空并点击发送即可重试';
          }
          else conversation.messages[assistantIndex].content = fullText.trim();
          conversation.updatedAt = Date.now();
          saveConversations();
          toast(aborted ? '已停止生成' : (error?.message || '请求失败，请检查接口设置与网络。'), !aborted);
        } finally {
          state.abortController = null;
          setGenerating(false);
          renderView();
          scrollToBottom(false);
          if (!controller.signal.aborted) el.followupInput.focus();
        }
      }

      async function startGeneration() {
        if (state.isGenerating) return;
        if (!state.handbook || !state.handbookChunks.length) {
          openHandbookImport(true);
          toast('请先导入工作手册。', true);
          return;
        }
        const content = makeInitialMessage();
        if (!content) return;
        let configuredHost = '';
        try { configuredHost = new URL(state.settings.baseUrl).hostname; } catch { /* handled in settings */ }
        if (!state.hasSavedSettings || (configuredHost === 'api.openai.com' && !state.settings.apiKey)) {
          openSettings(true);
          toast('请先填写并保存模型接口设置。');
          return;
        }
        createConversation(content);
        await requestAssistant();
      }

      async function sendFollowup() {
        if (state.isGenerating) {
          state.abortController?.abort();
          return;
        }
        const content = el.followupInput.value.trim();
        const conversation = currentConversation();
        if (!conversation) return;
        if (!state.handbook || !state.handbookChunks.length) {
          openHandbookImport(true);
          toast('请先导入工作手册。', true);
          return;
        }
        if (!content) {
          const lastMessage = conversation.messages[conversation.messages.length - 1];
          if (lastMessage?.role === 'user') await requestAssistant();
          return;
        }
        conversation.messages.push({ role: 'user', content, timestamp: Date.now() });
        conversation.updatedAt = Date.now();
        el.followupInput.value = '';
        autoResizeFollowup();
        saveConversations();
        renderView();
        scrollToBottom();
        await requestAssistant();
      }

      function copyConversation() {
        const conversation = currentConversation();
        if (!conversation) return;
        const text = conversation.messages
          .filter(message => message.content)
          .map(message => `${message.role === 'assistant' ? '校编助手' : '我'}：\n${message.content}`)
          .join('\n\n──────────\n\n');
        copyText(text, '已复制整个对话');
      }

      function autoResizeFollowup() {
        el.followupInput.style.height = 'auto';
        el.followupInput.style.height = `${Math.min(el.followupInput.scrollHeight, 145)}px`;
      }

      function openSidebar() {
        el.sidebar.classList.add('open');
        el.scrim.classList.add('open');
      }

      function closeSidebar() {
        el.sidebar.classList.remove('open');
        el.scrim.classList.remove('open');
      }

      el.writeTab.addEventListener('click', () => setMode('write'));
      el.reviseTab.addEventListener('click', () => setMode('revise'));
      el.checkTab.addEventListener('click', () => setMode('check'));
      el.writeInput.addEventListener('input', updateWriteCount);
      el.originalInput.addEventListener('input', () => el.originalInput.classList.remove('invalid'));
      el.requirementInput.addEventListener('input', () => el.requirementInput.classList.remove('invalid'));
      el.checkInput.addEventListener('input', () => el.checkInput.classList.remove('invalid'));
      el.generateButton.addEventListener('click', startGeneration);
      el.newChatButton.addEventListener('click', newConversation);
      el.clearHistoryButton.addEventListener('click', clearHistory);
      el.copyConversationButton.addEventListener('click', copyConversation);
      el.sendButton.addEventListener('click', sendFollowup);
      el.followupInput.addEventListener('input', autoResizeFollowup);
      el.mobileMenuButton.addEventListener('click', openSidebar);
      el.scrim.addEventListener('click', closeSidebar);

      [el.settingsButton, el.sidebarSettingsButton, el.topSettingsButton].forEach(button => {
        button.addEventListener('click', () => openSettings(false));
      });
      el.helpButton.addEventListener('click', () => openHelp(false));
      el.closeHelpButton.addEventListener('click', () => closeHelp());
      el.finishHelpButton.addEventListener('click', finishHelp);
      el.helpOverlay.addEventListener('click', event => {
        if (event.target === el.helpOverlay) closeHelp();
      });
      el.closeSettingsButton.addEventListener('click', () => closeSettings());
      el.cancelSettingsButton.addEventListener('click', () => closeSettings());
      el.settingsForm.addEventListener('submit', saveSettingsFromForm);
      el.settingsOverlay.addEventListener('click', event => {
        if (event.target === el.settingsOverlay) closeSettings();
      });
      el.replaceHandbookButton.addEventListener('click', () => {
        closeSettings();
        openHandbookImport(false);
      });
      el.closeHandbookButton.addEventListener('click', closeHandbookImport);
      el.handbookOverlay.addEventListener('click', event => {
        if (event.target === el.handbookOverlay) closeHandbookImport();
      });
      el.handbookDropZone.addEventListener('click', chooseHandbookFile);
      el.handbookDropZone.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          chooseHandbookFile();
        }
      });
      el.handbookFileInput.addEventListener('change', event => {
        importHandbookFile(event.target.files?.[0]);
      });
      ['dragenter', 'dragover'].forEach(type => {
        el.handbookDropZone.addEventListener(type, event => {
          event.preventDefault();
          el.handbookDropZone.classList.add('dragging');
        });
      });
      ['dragleave', 'dragend'].forEach(type => {
        el.handbookDropZone.addEventListener(type, () => el.handbookDropZone.classList.remove('dragging'));
      });
      el.handbookDropZone.addEventListener('drop', event => {
        event.preventDefault();
        el.handbookDropZone.classList.remove('dragging');
        importHandbookFile(event.dataTransfer?.files?.[0]);
      });
      el.revealKeyButton.addEventListener('click', () => {
        el.apiKeyInput.type = el.apiKeyInput.type === 'password' ? 'text' : 'password';
      });
      el.providerPresets.addEventListener('click', event => {
        const button = event.target.closest('[data-base-url]');
        if (!button) return;
        el.baseUrlInput.value = button.dataset.baseUrl || '';
        el.modelInput.value = button.dataset.model || '';
        el.apiKeyInput.focus();
      });
      [el.writeSystemPromptInput, el.reviseSystemPromptInput, el.checkSystemPromptInput]
        .forEach(input => input.addEventListener('input', updateSystemPromptCounts));
      [
        ['write', el.writeSystemPromptInput, el.resetWriteSystemPromptButton, '编写'],
        ['revise', el.reviseSystemPromptInput, el.resetReviseSystemPromptButton, '修改'],
        ['check', el.checkSystemPromptInput, el.resetCheckSystemPromptButton, '检查']
      ].forEach(([mode, input, button, label]) => {
        button.addEventListener('click', () => {
          input.value = SYSTEM_PROMPTS[mode];
          updateSystemPromptCounts();
          toast(`已恢复默认${label}提示词`);
        });
      });

      el.historyList.addEventListener('click', event => {
        const deleteButton = event.target.closest('[data-delete-id]');
        if (deleteButton) {
          event.stopPropagation();
          removeConversation(deleteButton.dataset.deleteId);
          return;
        }
        const item = event.target.closest('[data-id]');
        if (item) openConversation(item.dataset.id);
      });

      el.messages.addEventListener('click', event => {
        const button = event.target.closest('[data-copy-index]');
        if (!button) return;
        const conversation = currentConversation();
        const message = conversation?.messages[Number(button.dataset.copyIndex)];
        if (message) copyText(message.content, '已复制这条回复');
      });

      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          closeHelp();
          closeSettings();
          closeHandbookImport();
          closeSidebar();
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          if (document.activeElement === el.followupInput) sendFollowup();
          else if (!el.welcomeView.classList.contains('hidden')) startGeneration();
        }
      });

      loadState();
      updateWriteCount();
      renderHandbookStatus();
      renderView();
      window.setTimeout(continueOnboarding, 0);
    })();
