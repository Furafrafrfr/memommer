/**
 * メモのドメインモデル
 */
export type Memo = {
  readonly name: string;
  readonly content: string;
  readonly tags: readonly string[];
};

/**
 * メモを作成する
 */
export const createMemo = (
  name: string,
  content: string,
  tags: readonly string[] = []
): Memo => ({
  name,
  content,
  tags,
});

/**
 * フロントマター付きMarkdownからメモをパースする
 */
export const parseMemo = (name: string, markdown: string): Memo => {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n?---\n?([\s\S]*)$/);

  if (!frontmatterMatch) {
    return createMemo(name, markdown);
  }

  const [, frontmatter, content] = frontmatterMatch;
  const tags = parseTags(frontmatter);

  return createMemo(name, content, tags);
};

/**
 * フロントマターからタグを抽出する
 */
const parseTags = (frontmatter: string): readonly string[] => {
  const tagsMatch = frontmatter.match(/tags:\n((?:\s+-\s+.+\n?)*)/);

  if (!tagsMatch) {
    return [];
  }

  const tagsBlock = tagsMatch[1];
  const tags = tagsBlock
    .split("\n")
    .map((line) => line.match(/^\s+-\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => match[1]);

  return tags;
};

/**
 * メモをMarkdown形式にシリアライズする
 */
export const serializeMemo = (memo: Memo): string => {
  if (memo.tags.length === 0) {
    return memo.content;
  }

  const tagsYaml = memo.tags.map((tag) => `  - ${tag}`).join("\n");
  return `---\ntags:\n${tagsYaml}\n---\n${memo.content}`;
};
