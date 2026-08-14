// lib/pinyin-format.test.ts — self-check konversi pinyin angka → simbol
import test from "node:test";
import assert from "node:assert/strict";
import { numToSymbolPinyin } from "./pinyin-format";

test("konversi dasar huo4dong2 → huòdóng (tone sesuai input)", () => {
  // dong2 = o tone 2 → dóng. (Data DB asli 活动 tertulis dong2; standar HSK huódòng tone 4.)
  assert.equal(numToSymbolPinyin("huo4dong2"), "huòdóng");
  assert.equal(numToSymbolPinyin("huo2dong4"), "huódòng");
});

test("tone 4 di uo: huo4 → huò", () => {
  assert.equal(numToSymbolPinyin("huo4"), "huò");
});

test("zhong1guo2 → zhōngguó", () => {
  assert.equal(numToSymbolPinyin("zhong1guo2"), "zhōngguó");
});

test("a dapat mark: wan3 → wǎn, hao3 → hǎo", () => {
  assert.equal(numToSymbolPinyin("wan3"), "wǎn");
  assert.equal(numToSymbolPinyin("hao3"), "hǎo");
});

test("ui → i: shui3 → shuǐ", () => {
  assert.equal(numToSymbolPinyin("shui3"), "shuǐ");
});

test("iu → u: qiu1 → qiū, liu4 → liù", () => {
  assert.equal(numToSymbolPinyin("qiu1"), "qiū");
  assert.equal(numToSymbolPinyin("liu4"), "liù");
});

test("netral (5) tanpa mark: de5 → de, wei4le5 → wèile", () => {
  assert.equal(numToSymbolPinyin("de5"), "de");
  assert.equal(numToSymbolPinyin("wei4le5"), "wèile");
});

test("konsonan+digit: zhi1 → zhī, chi1 → chī, ri4 → rì, shi2 → shí", () => {
  assert.equal(numToSymbolPinyin("zhi1"), "zhī");
  assert.equal(numToSymbolPinyin("chi1"), "chī");
  assert.equal(numToSymbolPinyin("ri4"), "rì");
  assert.equal(numToSymbolPinyin("shi2"), "shí");
});

test("angka 1-10: yi1 er4 san1 si4 wu3 liu4 qi1 ba1 jiu3 shi2", () => {
  assert.equal(numToSymbolPinyin("yi1"), "yī");
  assert.equal(numToSymbolPinyin("er4"), "èr");
  assert.equal(numToSymbolPinyin("san1"), "sān");
  assert.equal(numToSymbolPinyin("si4"), "sì");
  assert.equal(numToSymbolPinyin("wu3"), "wǔ");
  assert.equal(numToSymbolPinyin("liu4"), "liù");
  assert.equal(numToSymbolPinyin("qi1"), "qī");
  assert.equal(numToSymbolPinyin("ba1"), "bā");
  assert.equal(numToSymbolPinyin("jiu3"), "jiǔ");
  assert.equal(numToSymbolPinyin("shi2"), "shí");
});

test("spasi dipertahankan: ni3 hao3 → nǐ hǎo", () => {
  assert.equal(numToSymbolPinyin("ni3 hao3"), "nǐ hǎo");
});

test("input tanpa angka tidak berubah", () => {
  assert.equal(numToSymbolPinyin("nihao"), "nihao");
  assert.equal(numToSymbolPinyin(""), "");
});

test("xue2 → xué, er2 → ér", () => {
  assert.equal(numToSymbolPinyin("xue2"), "xué");
  assert.equal(numToSymbolPinyin("er2"), "ér");
});
