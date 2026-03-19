#!/usr/bin/env node
/**
 * 시연 시나리오별 프리캐시 응답 생성 스크립트
 * 각 시연 입력을 API로 호출하여 결과를 precached-responses.json에 추가합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRECACHE_PATH = path.join(__dirname, '..', 'src', 'lib', 'precached-responses.json');
const BASE_URL = 'http://localhost:3000';

// 시연 시나리오: 순서대로 실행
const DEMO_SCENARIOS = [
    {
        name: "Scene 2: 매매 권유 거절",
        input: "KODEX 200 사야 해 말아야 해?",
        model: "sonnet",
    },
    {
        name: "Scene 3: 도메인 외 차단",
        input: "오늘 서울 날씨 알려줘",
        model: "sonnet",
    },
    {
        name: "Scene 4: ETF 상세 조회",
        input: "KODEX 반도체 ETF 수익률이 어떻게 되나요?",
        model: "sonnet",
    },
    {
        name: "Scene 5-1: 슬롯 필링 (1차)",
        input: "요즘 반도체 관련 ETF 뭐가 좋아?",
        model: "sonnet",
    },
    {
        name: "Scene 5-2: 슬롯 필링 (2차)",
        input: "국내 반도체, 수익률 기준으로 알려줘",
        model: "sonnet",
        conversationHistory: [
            { role: "user", content: "요즘 반도체 관련 ETF 뭐가 좋아?" },
            { role: "assistant", content: "반도체 ETF를 찾고 계시군요! 😊 좀 더 정확한 추천을 위해 여쭤볼게요.\n\n1️⃣ **국내 반도체** ETF를 찾으시나요, **해외 반도체** ETF를 찾으시나요?\n2️⃣ **수익률** 기준으로 찾으시나요, **수수료(보수)** 기준으로 찾으시나요?" }
        ]
    },
    {
        name: "Scene 6: 경쟁사 대안 비교",
        input: "TIGER 미국나스닥100 대신 KODEX로 갈아탈 수 있어?",
        model: "sonnet",
    },
    {
        name: "Scene 7: 포트폴리오 진단",
        input: "나 KODEX 200이랑 KODEX 미국S&P500 갖고 있어",
        model: "sonnet",
    },
    {
        name: "Scene 3-시점판단: 시점 판단 거절",
        input: "지금 반도체 ETF 들어가도 돼?",
        model: "sonnet",
    },
];

async function callAPI(scenario) {
    const body = {
        messages: [{ role: "user", content: scenario.input }],
        model: scenario.model || "sonnet",
    };
    if (scenario.conversationHistory) {
        body.conversationHistory = scenario.conversationHistory;
    }

    const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        throw new Error(`API error ${res.status}: ${await res.text()}`);
    }

    return await res.json();
}

async function main() {
    // 기존 캐시 로드
    let cache = {};
    try {
        cache = JSON.parse(fs.readFileSync(PRECACHE_PATH, 'utf-8'));
    } catch (e) {
        console.error("기존 캐시 로드 실패:", e.message);
    }

    console.log(`\n🎬 시연 시나리오 프리캐시 생성 시작 (${DEMO_SCENARIOS.length}개)\n`);

    for (let i = 0; i < DEMO_SCENARIOS.length; i++) {
        const scenario = DEMO_SCENARIOS[i];
        console.log(`[${i + 1}/${DEMO_SCENARIOS.length}] ${scenario.name}`);
        console.log(`   입력: "${scenario.input}"`);

        try {
            const result = await callAPI(scenario);

            cache[scenario.input] = {
                response: result.response,
                agent: result.agent,
                steps: result.steps,
                toolCallCount: result.toolCallCount,
                charts: result.charts || null,
            };

            console.log(`   ✅ 성공 (응답 ${result.response.length}자, 도구 ${result.toolCallCount}회)`);

            // 간격 두기
            await new Promise(r => setTimeout(r, 2000));
        } catch (error) {
            console.error(`   ❌ 실패: ${error.message}`);
        }
    }

    // 캐시 저장
    fs.writeFileSync(PRECACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
    console.log(`\n✅ 프리캐시 저장 완료: ${Object.keys(cache).length}개 항목`);
    console.log(`   파일: ${PRECACHE_PATH}\n`);
}

main().catch(console.error);
