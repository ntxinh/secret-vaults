import { handleAction } from "./lib/dispatch";
import type { SecretStore } from "./lib/dispatch";
import { rowToSecret, secretToRow } from "./lib/rows";
import { err, HEADERS } from "./lib/types";
import type { ApiResponse, Secret } from "./lib/types";

const SHEET_NAME = "secrets";

function getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("SPREADSHEET_ID script property is not set");
  const ss = SpreadsheetApp.openById(id);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([...HEADERS]);
  }
  return sheet;
}

function makeSheetStore(sheet: GoogleAppsScript.Spreadsheet.Sheet): SecretStore {
  // Data rows start at row 2 (row 1 = header).
  const readAll = (): Secret[] => {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    return sheet
      .getRange(2, 1, lastRow - 1, HEADERS.length)
      .getValues()
      .map(rowToSecret);
  };
  const findRowIndex = (id: string): number => {
    // returns 1-based sheet row number, or -1
    const all = readAll();
    const i = all.findIndex((s) => s.id === id);
    return i === -1 ? -1 : i + 2;
  };
  return {
    list: readAll,
    findById: (id) => readAll().find((s) => s.id === id) ?? null,
    insert: (secret) => {
      sheet.appendRow(secretToRow(secret) as string[]);
    },
    update: (secret) => {
      const rowIndex = findRowIndex(secret.id);
      if (rowIndex === -1) throw new Error(`row not found for id ${secret.id}`);
      sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([secretToRow(secret)]);
    },
    remove: (id) => {
      const rowIndex = findRowIndex(id);
      if (rowIndex === -1) return false;
      sheet.deleteRow(rowIndex);
      return true;
    },
  };
}

const WRITE_ACTIONS = ["create", "update", "delete"];

export function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  let response: ApiResponse;
  try {
    const body = JSON.parse(e.postData.contents) as {
      token?: unknown;
      action?: unknown;
      payload?: unknown;
    };
    const expected = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
    if (!expected || body.token !== expected) {
      response = err("UNAUTHORIZED", "invalid token");
    } else {
      const deps = {
        store: makeSheetStore(getSheet()),
        uuid: () => Utilities.getUuid(),
        now: () => new Date().toISOString(),
      };
      if (WRITE_ACTIONS.includes(String(body.action))) {
        const lock = LockService.getScriptLock();
        lock.waitLock(10_000);
        try {
          response = handleAction(body.action, body.payload, deps);
        } finally {
          lock.releaseLock();
        }
      } else {
        response = handleAction(body.action, body.payload, deps);
      }
    }
  } catch (e2) {
    response = err("INTERNAL", e2 instanceof Error ? e2.message : String(e2));
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
