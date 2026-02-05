import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDefaultMemoDir, getDefaultDbPath } from "./config.js";
import * as path from "node:path";

describe("getDefaultMemoDir", () => {
  const originalEnv = process.env.MEMOMER_DIR;
  const originalCwd = process.cwd();

  afterEach(() => {
    // 環境変数を元に戻す
    if (originalEnv !== undefined) {
      process.env.MEMOMER_DIR = originalEnv;
    } else {
      delete process.env.MEMOMER_DIR;
    }
  });

  it("環境変数MEMOMER_DIRが設定されていない場合、カレントディレクトリを返す", () => {
    delete process.env.MEMOMER_DIR;
    const result = getDefaultMemoDir();
    expect(result).toBe(process.cwd());
  });

  it("環境変数MEMOMER_DIRが設定されている場合、その値を返す", () => {
    const customDir = "/custom/memo/dir";
    process.env.MEMOMER_DIR = customDir;
    const result = getDefaultMemoDir();
    expect(result).toBe(customDir);
  });
});

describe("getDefaultDbPath", () => {
  const originalMemoDir = process.env.MEMOMER_DIR;
  const originalDbPath = process.env.MEMOMER_DB_PATH;

  afterEach(() => {
    // 環境変数を元に戻す
    if (originalMemoDir !== undefined) {
      process.env.MEMOMER_DIR = originalMemoDir;
    } else {
      delete process.env.MEMOMER_DIR;
    }
    if (originalDbPath !== undefined) {
      process.env.MEMOMER_DB_PATH = originalDbPath;
    } else {
      delete process.env.MEMOMER_DB_PATH;
    }
  });

  it("環境変数が未設定の場合、カレントディレクトリ/.memomer.dbを返す", () => {
    delete process.env.MEMOMER_DIR;
    delete process.env.MEMOMER_DB_PATH;
    const result = getDefaultDbPath();
    const expected = path.join(process.cwd(), ".memomer.db");
    expect(result).toBe(expected);
  });

  it("環境変数MEMOMER_DB_PATHが設定されている場合、その値を返す", () => {
    const customDbPath = "/custom/db/path.db";
    process.env.MEMOMER_DB_PATH = customDbPath;
    const result = getDefaultDbPath();
    expect(result).toBe(customDbPath);
  });

  it("環境変数MEMOMER_DIRが設定されている場合、そのディレクトリ配下に.memomer.dbを配置", () => {
    const customDir = "/custom/memo/dir";
    process.env.MEMOMER_DIR = customDir;
    delete process.env.MEMOMER_DB_PATH;
    const result = getDefaultDbPath();
    const expected = path.join(customDir, ".memomer.db");
    expect(result).toBe(expected);
  });
});
