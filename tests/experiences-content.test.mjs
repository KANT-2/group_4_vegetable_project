import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPERIENCE_CONTENT,
  getExperienceContent,
} from "../src/lib/experiences-content.ts";

// 체험 시드(supabase/seeds/experiences.sql)의 체험 id 와 상세 안내 내용이 짝이 맞는지 확인해요.
const SEEDED_IDS = ["apple-picking", "carrot-harvest", "kimjang-class"];

test("시드의 체험 3개 모두 상세 안내가 있다", () => {
  for (const id of SEEDED_IDS) {
    const content = getExperienceContent(id);
    assert.ok(content, `${id} 안내가 없어요`);
    assert.ok(content.duration, `${id} 소요 시간이 비었어요`);
    assert.ok(content.steps.length >= 3, `${id} 진행 순서가 너무 적어요`);
    assert.ok(content.included.length > 0, `${id} 포함 사항이 비었어요`);
    assert.ok(content.bring.length > 0, `${id} 준비물이 비었어요`);
    assert.ok(content.audience.length > 0, `${id} 추천 대상이 비었어요`);
    assert.ok(content.tagline, `${id} 한 줄 소개가 비었어요`);
    assert.ok(content.intro.length > 0, `${id} 소개 문단이 비었어요`);
    assert.ok(content.highlights.length >= 3, `${id} 체험 포인트가 적어요`);
    assert.ok(content.farmStory, `${id} 농가 이야기가 비었어요`);
    assert.ok(content.takeHome.length > 0, `${id} 가져가는 것이 비었어요`);
    assert.ok(content.meeting, `${id} 모이는 곳이 비었어요`);
    assert.ok(content.faq.length >= 3, `${id} 자주 묻는 질문이 적어요`);
  }
});

test("자주 묻는 질문은 질문과 답이 모두 있고 겹치지 않는다", () => {
  for (const [id, content] of Object.entries(EXPERIENCE_CONTENT)) {
    const questions = content.faq.map((f) => f.q);
    assert.equal(new Set(questions).size, questions.length, `${id} 질문 중복`);
    for (const f of content.faq) assert.ok(f.q && f.a, `${id}: ${f.q}`);
  }
});

test("진행 순서의 각 단계에는 제목·시간·설명이 있다", () => {
  for (const [id, content] of Object.entries(EXPERIENCE_CONTENT)) {
    for (const step of content.steps) {
      assert.ok(step.title && step.time && step.text, `${id}: ${step.title}`);
    }
  }
});

test("모든 체험 안내에 취소 규칙과 결제 없음 안내가 들어 있다", () => {
  for (const [id, content] of Object.entries(EXPERIENCE_CONTENT)) {
    const notes = content.notes.join(" ");
    assert.match(notes, /24시간/, `${id} 취소 기한 안내`);
    assert.match(notes, /결제하지 않아요/, `${id} 결제 없음 안내`);
    assert.match(notes, /1~10명/, `${id} 인원 안내`);
  }
});

test("없는 체험은 null 을 돌려준다", () => {
  assert.equal(getExperienceContent("no-such-experience"), null);
});
