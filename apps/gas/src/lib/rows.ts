import type { Row, Secret } from "./types";

export function secretToRow(s: Secret): Row {
  return [
    s.id, s.name, s.value, s.type, s.project,
    s.environment.join(","), s.tags.join(","), s.notes, s.createdAt, s.updatedAt,
  ];
}

export function rowToSecret(row: Row): Secret {
  const cell = (i: number): string => (row[i] === undefined || row[i] === null ? "" : String(row[i]));
  const environmentCell = cell(5);
  const environments = environmentCell === ""
    ? []
    : environmentCell.split(",").map((e) => e.trim()).filter(Boolean) as Secret["environment"];
  const tagsCell = cell(6);
  return {
    id: cell(0),
    name: cell(1),
    value: cell(2),
    type: cell(3) as Secret["type"],
    project: cell(4),
    environment: environments,
    tags: tagsCell === "" ? [] : tagsCell.split(",").map((t) => t.trim()).filter(Boolean),
    notes: cell(7),
    createdAt: cell(8),
    updatedAt: cell(9),
  };
}
