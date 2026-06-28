const fs = require('fs');

// Load core functions from temp_core.js (no DOM dependencies)
const coreCode = fs.readFileSync('temp_core.js', 'utf-8');
eval(coreCode);

// Load sample files
const chunchaoRaw = JSON.parse(fs.readFileSync('【春潮】全息韩国真实生活模拟器-20260628.json', 'utf-8'));
const fengyueRaw = JSON.parse(fs.readFileSync('[风月]穿成阿龙，但这次鱼人说了算-20260628-104717.json', 'utf-8'));
const missRaw = JSON.parse(fs.readFileSync('【MISS】海拉鲁悲歌交响.json', 'utf-8'));

// Parse all three
const ccUIF = parseJSON(chunchaoRaw);
const fyUIF = parseJSON(fengyueRaw);
const msUIF = parseJSON(missRaw);

// Render all outputs
const cc2md = renderMarkdown(ccUIF);
const cc2cc = renderChunchao(ccUIF);
const cc2fy = renderFengyue(ccUIF);
const cc2ms = renderMiss(ccUIF);

const fy2md = renderMarkdown(fyUIF);
const fy2cc = renderChunchao(fyUIF);
const fy2fy = renderFengyue(fyUIF);
const fy2ms = renderMiss(fyUIF);

const ms2md = renderMarkdown(msUIF);
const ms2cc = renderChunchao(msUIF);
const ms2fy = renderFengyue(msUIF);
const ms2ms = renderMiss(msUIF);

function check(label, condition, detail) {
  console.log((condition ? '  [PASS]' : '  [FAIL]') + ' ' + label + (detail ? ' -- ' + detail : ''));
}

// =============================================
// AUDIT: 春潮
// =============================================
console.log('');
console.log('========================================');
console.log('  春潮样本 -> UIF -> 各格式 审计');
console.log('========================================');
console.log('');

const ccWork = chunchaoRaw.work;

check('title 一致', ccUIF.meta.title === '全息韩国真实生活模拟器');
check('title -> md', cc2md.includes('全息韩国真实生活模拟器'));
check('title -> cc', JSON.parse(cc2cc).work.title === '全息韩国真实生活模拟器');
check('title -> fy', JSON.parse(cc2fy).name === '全息韩国真实生活模拟器');
check('title -> ms', JSON.parse(cc2ms).name === '全息韩国真实生活模拟器');

const ccSummaryExpected = ccWork.intro.split('\n')[0].trim();
check('summary 一致', ccUIF.meta.summary === ccSummaryExpected);
check('summary -> md', cc2md.includes(ccSummaryExpected.substring(0, 30)));

check('orientation 一致', ccUIF.meta.orientation === '男性向');
check('orientation -> md', cc2md.includes('男性向'));
check('orientation -> cc', JSON.parse(cc2cc).work.orientation === '男性向');

check('mainPrompt 一致', ccUIF.prompts.mainPrompt === ccWork.mainPrompt);
check('mainPrompt -> cc', JSON.parse(cc2cc).work.mainPrompt === ccWork.mainPrompt);
check('mainPrompt -> fy pre_prompt 包含', cc2fy.includes(ccWork.mainPrompt.substring(0, 50)));
check('mainPrompt -> ms systemPrompt', JSON.parse(cc2ms).promptData.systemPrompt === ccWork.mainPrompt);

check('suffixPrompt 一致', ccUIF.prompts.suffixPrompt === ccWork.suffixPrompt);
check('suffixPrompt -> cc', JSON.parse(cc2cc).work.suffixPrompt === ccWork.suffixPrompt);

check('coverUrl 一致', ccUIF.assets.coverUrl === ccWork.coverUrl);
check('coverUrl -> cc', JSON.parse(cc2cc).work.coverUrl === ccWork.coverUrl);
check('coverUrl -> fy', JSON.parse(cc2fy).cover === ccWork.coverUrl);

check('bgImageUrl 一致', ccUIF.assets.bgImageUrl === ccWork.bgImageUrl);
check('bgImageUrl -> cc', JSON.parse(cc2cc).work.bgImageUrl === ccWork.bgImageUrl);

check('worldview 一致', ccUIF.prompts.worldview === ccWork.worldviewDefinition);

check('worldBook 数量一致', ccUIF.worldBook.length === ccWork.worldBookEntries.length);
check('worldBook -> cc 数量', JSON.parse(cc2cc).work.worldBookEntries.length === 75);
check('worldBook -> fy 数量', JSON.parse(cc2fy).world_book.length === 75);
check('worldBook -> ms 数量', JSON.parse(cc2ms).world_book.length === 75);

const ccFirstWB = ccWork.worldBookEntries[0];
check('WB[0] keywords 一致', JSON.stringify(ccUIF.worldBook[0].keywords) === JSON.stringify(ccFirstWB.keywords));
check('WB[0] content 一致', ccUIF.worldBook[0].content === ccFirstWB.content);
check('WB[0] group 一致', ccUIF.worldBook[0].group === ccFirstWB.groupName);
check('WB[0] enabled 一致', ccUIF.worldBook[0].enabled === ccFirstWB.enabled);

check('customCss 一致', ccUIF.extras.customCss === ccWork.customCss);
check('quickCommands 一致', JSON.stringify(ccUIF.extras.quickCommands) === JSON.stringify(ccWork.quickCommands));

// =============================================
// AUDIT: 风月
// =============================================
console.log('');
console.log('========================================');
console.log('  风月样本 -> UIF -> 各格式 审计');
console.log('========================================');
console.log('');

check('title 一致', fyUIF.meta.title === '穿成阿龙，但这次鱼人说了算');
check('title -> md', fy2md.includes('穿成阿龙'));
check('title -> cc', JSON.parse(fy2cc).work.title === '穿成阿龙，但这次鱼人说了算');
check('title -> fy', JSON.parse(fy2fy).name === '穿成阿龙，但这次鱼人说了算');
check('title -> ms', JSON.parse(fy2ms).name === '穿成阿龙，但这次鱼人说了算');

const fySummaryExpected = fengyueRaw.summary.split('\n')[0].trim();
check('summary 一致', fyUIF.meta.summary === fySummaryExpected);

check('mainPrompt 一致', fyUIF.prompts.mainPrompt === fengyueRaw.pre_prompt);
check('mainPrompt -> fy pre_prompt 包含', fy2fy.includes(fengyueRaw.pre_prompt.substring(0, 50)));
check('mainPrompt -> cc', JSON.parse(fy2cc).work.mainPrompt === fengyueRaw.pre_prompt);
check('mainPrompt -> ms', JSON.parse(fy2ms).promptData.systemPrompt === fengyueRaw.pre_prompt);

check('postText 一致', fyUIF.prompts.postText === fengyueRaw.post_text);
check('postText -> fy post_text 包含', fy2fy.includes(fengyueRaw.post_text.substring(0, 50)));

check('coverUrl 一致', fyUIF.assets.coverUrl === fengyueRaw.cover);
check('coverUrl -> fy', JSON.parse(fy2fy).cover === fengyueRaw.cover);
check('coverUrl -> cc', JSON.parse(fy2cc).work.coverUrl === fengyueRaw.cover);

check('bgImageUrl 一致', fyUIF.assets.bgImageUrl === fengyueRaw.bg_image);
check('bgImageUrl -> fy', JSON.parse(fy2fy).bg_image === fengyueRaw.bg_image);

check('language 一致', fyUIF.meta.language === 'zh-Hans');
check('language -> fy', JSON.parse(fy2fy).language === 'zh-Hans');

const fyTagsExpected = fengyueRaw.tags.map(t => t.name);
check('tags 一致', JSON.stringify(fyUIF.meta.tags) === JSON.stringify(fyTagsExpected));
check('tags -> fy', JSON.stringify(JSON.parse(fy2fy).tags.map(t => t.name)) === JSON.stringify(fyTagsExpected));

check('bannedWords 一致', JSON.stringify(fyUIF.extras.bannedWords) === JSON.stringify(fengyueRaw.banned_words));
check('bannedWords -> fy', JSON.stringify(JSON.parse(fy2fy).banned_words) === JSON.stringify(fengyueRaw.banned_words));

check('worldBook 数量一致', fyUIF.worldBook.length === fengyueRaw.world_book.length);
check('worldBook -> fy 数量', JSON.parse(fy2fy).world_book.length === 4);
check('worldBook -> cc 数量', JSON.parse(fy2cc).work.worldBookEntries.length === 4);
check('worldBook -> ms 数量', JSON.parse(fy2ms).world_book.length === 4);

const fyFirstWB = fengyueRaw.world_book[0];
const fyExpectedKeywords = fyFirstWB.key.split(/@wb@/).map(s => s.replace(/^_or_/, '').replace(/^_and_/, '')).filter(Boolean);
check('WB[0] keywords 解析正确', JSON.stringify(fyUIF.worldBook[0].keywords) === JSON.stringify(fyExpectedKeywords));
check('WB[0] content 一致', fyUIF.worldBook[0].content === fyFirstWB.value);
check('WB[0] enabled 一致', fyUIF.worldBook[0].enabled === fyFirstWB.enable);

// =============================================
// AUDIT: MISS
// =============================================
console.log('');
console.log('========================================');
console.log('  MISS样本 -> UIF -> 各格式 审计');
console.log('========================================');
console.log('');

check('title 一致', msUIF.meta.title === '海拉鲁悲歌交响');
check('title -> md', ms2md.includes('海拉鲁悲歌交响'));
check('title -> cc', JSON.parse(ms2cc).work.title === '海拉鲁悲歌交响');
check('title -> fy', JSON.parse(ms2fy).name === '海拉鲁悲歌交响');
check('title -> ms', JSON.parse(ms2ms).name === '海拉鲁悲歌交响');

check('mainPrompt 一致', msUIF.prompts.mainPrompt === missRaw.promptData.systemPrompt);
check('mainPrompt -> ms', JSON.parse(ms2ms).promptData.systemPrompt === missRaw.promptData.systemPrompt);
check('mainPrompt -> cc', JSON.parse(ms2cc).work.mainPrompt === missRaw.promptData.systemPrompt);
check('mainPrompt -> fy pre_prompt 包含', ms2fy.includes(missRaw.promptData.systemPrompt.substring(0, 50)));

check('identityStyle 一致', msUIF.prompts.identityStyle === missRaw.promptData.aiIdentityStylePrompt);
check('identityStyle -> ms', JSON.parse(ms2ms).promptData.aiIdentityStylePrompt === missRaw.promptData.aiIdentityStylePrompt);

check('worldview 一致', msUIF.prompts.worldview === missRaw.promptData.worldViewPrompt);
check('worldview -> ms', JSON.parse(ms2ms).promptData.worldViewPrompt === missRaw.promptData.worldViewPrompt);

check('suffixPrompt 一致', msUIF.prompts.suffixPrompt === missRaw.promptData.postPrompt);

check('tags 一致', JSON.stringify(msUIF.meta.tags) === JSON.stringify(missRaw.tags));
check('tags -> ms', JSON.stringify(JSON.parse(ms2ms).tags) === JSON.stringify(missRaw.tags));

check('orientation 一致', msUIF.meta.orientation === '男性向');
check('orientation -> ms', JSON.parse(ms2ms).genderOrientation === '男性向');

check('worldBook 数量一致', msUIF.worldBook.length === missRaw.world_book.length);
check('worldBook -> ms 数量', JSON.parse(ms2ms).world_book.length === 6);
check('worldBook -> cc 数量', JSON.parse(ms2cc).work.worldBookEntries.length === 6);
check('worldBook -> fy 数量', JSON.parse(ms2fy).world_book.length === 6);

const msFirstWB = missRaw.world_book[0];
check('WB[0] keywords 一致', JSON.stringify(msUIF.worldBook[0].keywords) === JSON.stringify(msFirstWB.key));
check('WB[0] content 一致', msUIF.worldBook[0].content === msFirstWB.value);
check('WB[0] enabled 一致', msUIF.worldBook[0].enabled === msFirstWB.enabled);

check('customCss 一致', msUIF.extras.customCss === missRaw.customCSS);
check('bannedWords 一致', JSON.stringify(msUIF.extras.bannedWords) === JSON.stringify(missRaw.blockedWords));

// =============================================
// 往返一致性
// =============================================
console.log('');
console.log('========================================');
console.log('  往返一致性 (Round-trip)');
console.log('========================================');
console.log('');

function roundTripCheck(label, rendered, parserFn) {
  try {
    const parsed = JSON.parse(rendered);
    parserFn(parsed);
    console.log('  [PASS] ' + label);
  } catch(e) {
    console.log('  [FAIL] ' + label + ' -- ' + e.message);
  }
}

roundTripCheck('春潮->春潮->UIF', cc2cc, parseChunchao);
roundTripCheck('春潮->风月->UIF', cc2fy, parseFengyue);
roundTripCheck('春潮->MISS->UIF', cc2ms, parseMiss);
roundTripCheck('风月->春潮->UIF', fy2cc, parseChunchao);
roundTripCheck('风月->风月->UIF', fy2fy, parseFengyue);
roundTripCheck('风月->MISS->UIF', fy2ms, parseMiss);
roundTripCheck('MISS->春潮->UIF', ms2cc, parseChunchao);
roundTripCheck('MISS->风月->UIF', ms2fy, parseFengyue);
roundTripCheck('MISS->MISS->UIF', ms2ms, parseMiss);

console.log('');
console.log('========================================');
console.log('  审计完成');
console.log('========================================');
