import { parse } from "csv-parse/sync";

export type CsvRow = {
  order?: number | null;
  korean: string;
  translation: string;
  chapter: string;
};

const expectedHeaders = ["order", "korean", "translation", "chapter"];

export function parseCsvOrThrow(csvText: string): CsvRow[] {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    throw new Error("CSV has no data rows.");
  }

  const headers = Object.keys(records[0] ?? {});
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

  if (
    normalizedHeaders.length !== expectedHeaders.length ||
    !expectedHeaders.every((h) => normalizedHeaders.includes(h))
  ) {
    throw new Error(
      "CSV headers must be exactly: order, korean, translation, chapter."
    );
  }

  return records.map((row, index) => {
    const orderValue = row["order"] ?? row["Order"] ?? row["ORDER"];
    const korean = (row["korean"] ?? row["Korean"] ?? row["KOREAN"] ?? "").trim();
    const translation =
      (row["translation"] ?? row["Translation"] ?? row["TRANSLATION"] ?? "").trim();
    const chapter =
      (row["chapter"] ?? row["Chapter"] ?? row["CHAPTER"] ?? "").trim();

    if (!korean || !translation || !chapter) {
      throw new Error(
        `Row ${index + 2} is missing required values. Each row must include korean, translation, and chapter.`
      );
    }

    const order = orderValue ? Number(orderValue) : null;
    return {
      order: Number.isFinite(order) ? order : null,
      korean,
      translation,
      chapter,
    };
  });
}
